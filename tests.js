function testImmediateAddress () {
    cpu.debugSet("PC", 0x000F);
    const result = cpu.immediate();
    updateHtml();
    console.assert(result === 0x000F, "Immediate Address test failed, expected `0x000F`, received " + hex(result, 4));
}

function testZeroPageAddress () {
    cpu.debugSet("PC", 0x000F);
    writeToMemory(0x000F, [0x17]);
    const result = cpu.zeroPage();
    updateHtml();
    console.assert(result === 0x17, "Zero Page Address test failed, expected `0x17`, received " + hex(result, 4));
}

function testZeroPageIndexedAddress () {
    cpu.debugSet("PC", 0x000F);
    cpu.debugSet("X", 0xAA);
    writeToMemory(0x000F, [0x17]);
    const result = cpu.zeroPageIndexed(0xAA);
    updateHtml();
    console.assert(result === (0x17 + 0xAA) & 0xFF, "Zero Page Indexed Address test failed, expected `" + (0x17 + 0xAA) & 0xFF + "`, received " + hex(result, 4));
}

function testAbsoluteAddress () {
    cpu.debugSet("PC", 0x000F);
    writeToMemory(0x000F, [0x17, 0xAA]);
    const result = cpu.absolute();
    console.assert(result === (0x17 | (0xAA << 8)) & 0xFFFF, "Absolute Address test failed, expected `" + (0x17 | (0xAA << 8)) & 0xFFFF + "`, received " + hex(result, 4));
    updateHtml();
}

function testAbsoluteXYAddressNoPage () {
    cpu.debugSet("PC", 0x001F);
    cpu.debugSet("X", 0x42);
    writeToMemory(0x001F, [0x00, 0x30]);
    const result = cpu.absoluteXY(cpu.getRegister("X"));
    updateHtml();
    console.assert(result.addr === 0x3042, "Absolute XY Address No Page test failed, expected `0x3042`, received " + hex(result, 4));
    console.assert(result.pageCrossed === 0, "Absolute XY Address Page test failed, expected `0`, received " + result.pageCrossed);
}

function testAbsoluteXYAddressPage () {
    cpu.debugSet("PC", 0x001F);
    cpu.debugSet("X", 0x42);
    writeToMemory(0x001F, [0xD0, 0x03]);
    const result = cpu.absoluteXY(cpu.getRegister("X"));
    updateHtml();
    console.assert(result.addr === 0x0412, "AbsoluteXY Address Page test failed, expected `0x0412`, received " + hex(result, 4));
    console.assert(result.pageCrossed === 1, "Absolute XY Address Page test failed, expected `1`, received " + result.pageCrossed);
}

function testIndirectXAddress () {
    cpu.debugSet("PC", 0x000F);
    cpu.debugSet("X", 0x42);
    writeToMemory(0x000F, [0x17]);
    writeToMemory(0x0059, [0x17, 0xAA]);
    writeToMemory(0xAA17, [0x17, 0xAA]);
    const result = cpu.indirectX();
    updateHtml();
    console.assert(result === 0xAA17, "Indirect X Address test failed, expected `0xAA17`, received " + hex(result, 4));
}

function testIndirectYAddressNoPage () {
    cpu.debugSet("PC", 0x00F0);
    cpu.debugSet("Y", 0x42);
    writeToMemory(0x00F0, [0x17]);
    writeToMemory(0x0017, [0x17, 0xAA]);
    writeToMemory(0xAA17, [0x17, 0xAA]);
    const result = cpu.indirectY();
    updateHtml();
    console.assert(result.addr === 0xAA59, "Indirect Y No Page Address test failed, expected `0xAA59`, received " + hex(result.addr, 4));
    console.assert(result.pageCrossed === 0, "Indirect Y No Page Address Page test failed, expected `0`, received " + result.pageCrossed);
}

function testIndirectYAddressPage () {
    cpu.debugSet("PC", 0x00F0);
    cpu.debugSet("Y", 0x42);
    writeToMemory(0x00F0, [0x17]);
    writeToMemory(0x0017, [0x17, 0xAA]);
    writeToMemory(0xAA17, [0x17, 0xAA]);
    const result = cpu.indirectY();
    updateHtml();
    console.assert(result.addr === 0xAA59, "Indirect Y Page Address test failed, expected `0xAA59`, received " + hex(result.addr, 4));
    console.assert(result.pageCrossed === 0, "Indirect Y Page Address Page test failed, expected `0`, received " + result.pageCrossed);
}

function testADC () {
    cpu.debugSet("A", 0xD0);
    cpu.debugSet("PC", 0x000F);
    cpu.debugSet("C", 0);
    writeToMemory(0x000F, [0x30]);
    cpu.adc(cpu.immediate());
    console.assert(cpu.getRegister("A") === 0x00, "ADC test failed, expected `0x00`, received " + hex(cpu.getRegister("A")));
    console.assert(cpu.getFlag("N") === 0, "ADC Negative Flag test failed, expected `0`, received " + cpu.getFlag("N"));
    console.assert(cpu.getFlag("V") === 0, "ADC Overflow Flag test failed, expected `0`, received " + cpu.getFlag("V"));
    console.assert(cpu.getFlag("Z") === 1, "ADC Zero Flag test failed, expected `1`, received " + cpu.getFlag("Z"));
    updateHtml();
    cpu.debugSet("A", 0x50);
    cpu.debugSet("C", 1);
    cpu.debugSet("PC", 0x000F);
    cpu.adc(cpu.immediate());
    console.assert(cpu.getRegister("A") === 0x81, "ADC with Carry test failed, expected `0x81`, received " + hex(cpu.getRegister("A")));
    console.assert(cpu.getFlag("N") === 1, "ADC Negative Flag test failed, expected `1`, received " + cpu.getFlag("N"));
    console.assert(cpu.getFlag("V") === 1, "ADC Overflow Flag test failed, expected `1`, received " + cpu.getFlag("V"));
    console.assert(cpu.getFlag("Z") === 0, "ADC Zero Flag test failed, expected `0`, received " + cpu.getFlag("Z"));
    updateHtml();
}

function testAND () {
    cpu.debugSet("A", 0x55);
    cpu.debugSet("PC", 0x000F);
    writeToMemory(0x000F, [0xAA]);
    cpu.and(cpu.immediate());
    console.assert(cpu.getRegister("A") === 0x00, "AND test failed, expected `0x00`, received " + hex(cpu.getRegister("A")));
    console.assert(cpu.getFlag("N") === 0, "AND Negative Flag test failed, expected `0`, received " + cpu.getFlag("N"));
    console.assert(cpu.getFlag("Z") === 1, "AND Zero Flag test failed, expected `1`, received " + cpu.getFlag("Z"));
    updateHtml();
}

function testASL () {
    cpu.debugSet("A", 0xAA);
    writeToMemory(0x000F, [0xAA]);
    cpu.asl(cpu.immediate(), true);
    console.assert(cpu.getRegister("A") === 0x54, "ASL test failed, expected `0x54`, received " + hex(cpu.getRegister("A")));
    console.assert(cpu.getFlag("C") === 1, "ASL Carry Flag test failed, expected `1`, received " + cpu.getFlag("C"));
    console.assert(cpu.getFlag("N") === 0, "ASL Negative Flag test failed, expected `0`, received " + cpu.getFlag("N"));
    console.assert(cpu.getFlag("Z") === 0, "ASL Zero Flag test failed, expected `0`, received " + cpu.getFlag("Z"));
    updateHtml();
}

function testCMP() {
    cpu.debugSet("A", 0x55);
    cpu.debugSet("PC", 0x000F);
    writeToMemory(0x000F, [0x50]);
    cpu.cmp(cpu.immediate());
    updateHtml();
    console.assert(cpu.getFlag("C") === 1, "CMP Carry Flag test failed, expected `1`, received " + cpu.getFlag("C"));
    console.assert(cpu.getFlag("Z") === 0, "CMP Zero Flag test failed, expected `0`, received " + cpu.getFlag("Z"));
    console.assert(cpu.getFlag("N") === 0, "CMP Negative Flag test failed, expected `1`, received " + cpu.getFlag("N"));
}

function testCPX() {
    cpu.debugSet("X", 0x20);
    cpu.debugSet("PC", 0x000F);
    writeToMemory(0x000F, [0x20]);
    cpu.cpx_y(cpu.getRegister("X"), cpu.immediate());
    updateHtml();
    console.assert(cpu.getFlag("C") === 1, "CPX Carry Flag test failed, expected `1`, received " + cpu.getFlag("C"));
    console.assert(cpu.getFlag("Z") === 1, "CPX Zero Flag test failed, expected `1`, received " + cpu.getFlag("Z"));
    console.assert(cpu.getFlag("N") === 0, "CPX Negative Flag test failed, expected `0`, received " + cpu.getFlag("N"));
}

function testDecInc() {
    cpu.debugSet("PC", 0x000F);
    writeToMemory(0x000F, [0x17]);
    writeToMemory(0x0017, [0xFF]);
    cpu.decInc(cpu.zeroPage(), true);
    updateHtml();
    console.assert(cpu.memory[0x0017] === 0x00, "DEC test failed, expected `0x00`, received " + hex(cpu.memory[0x0017]));
    console.assert(cpu.getFlag("Z") === 1, "DEC Zero Flag test failed, expected `1`, received " + cpu.getFlag("Z"));
    console.assert(cpu.getFlag("N") === 0, "DEC Negative Flag test failed, expected `0`, received " + cpu.getFlag("N"));
    cpu.debugSet("PC", 0x000F);
    cpu.decInc(cpu.zeroPage(), false);
    updateHtml();
    console.assert(cpu.memory[0x0017] === 0xFF, "INC test failed, expected `0xFF`, received " + hex(cpu.memory[0x0017]));
    console.assert(cpu.getFlag("Z") === 0, "INC Zero Flag test failed, expected `0`, received " + cpu.getFlag("Z"));
    console.assert(cpu.getFlag("N") === 1, "INC Negative Flag test failed, expected `1`, received " + cpu.getFlag("N"));
}

function testPush() {
    cpu.debugSet("PC", 0x000F);
    cpu.debugSet("SP", 0xFF);
    cpu.push(0x42);
    updateHtml();
    console.assert(cpu.memory[0x01FF] === 0x42, "Push test failed, expected `0x42` at address `0x01FF`, received " + hex(cpu.memory[0x01FF]));
    console.assert(cpu.getRegister("SP") === 0xFE, "Push Stack Pointer test failed, expected `0xFE`, received " + hex(cpu.getRegister("SP")));
}

function testPop() {
    cpu.debugSet("PC", 0x000F);
    writeToMemory(0x01FF, [0x42]);
    const value = cpu.pop();
    updateHtml();
    console.assert(value === 0x42, "Pop test failed, expected `0x42`, received " + hex(value));
    console.assert(cpu.getRegister("SP") === 0xFF, "Pop Stack Pointer test failed, expected `0xFF`, received " + hex(cpu.getRegister("SP")));
}

function testDecIncXY () {
    cpu.debugSet("X", 0x0F);
    cpu.debugSet("Y", 0xF0);
    cpu.decIncXY("X", true);
    updateHtml();
    console.assert(cpu.getRegister("X") === 0x10, "DEC X test failed, expected `0x10`, received " + hex(cpu.getRegister("X")));
    cpu.decIncXY("Y", false);
    updateHtml();
    console.assert(cpu.getRegister("Y") === 0xEF, "INC Y test failed, expected `0xEF`, received " + hex(cpu.getRegister("Y")));
}

function testEor () {
    cpu.debugSet("A", 0x55);       // 01010101
    cpu.debugSet("PC", 0x000F);
    writeToMemory(0x000F, [0xFF]);  // 11111111
    cpu.eor(cpu.immediate());           // Result should be 10101010 (0xAA)
    updateHtml();
    console.assert(cpu.getRegister("A") === 0xAA, "EOR test failed, expected `0xAA`, received " + hex(cpu.getRegister("A")));
    console.assert(cpu.getFlag("N") === 1, "EOR Negative Flag test failed, expected `1`, received " + cpu.getFlag("N"));
    console.assert(cpu.getFlag("Z") === 0, "EOR Zero Flag test failed, expected `0`, received " + cpu.getFlag("Z"));
}

function testLda () {
    cpu.debugSet("PC", 0x000F);
    writeToMemory(0x000F, [0x42]);
    cpu.lda(cpu.immediate());
    updateHtml();
    console.assert(cpu.getRegister("A") === 0x42, "LDA test failed, expected `0x42`, received " + hex(cpu.getRegister("A")));
}

function testLdxy () {
    cpu.debugSet("PC", 0x000F);
    writeToMemory(0x000F, [0x42]);
    cpu.ldXY(cpu.immediate(), "X");
    updateHtml();
    console.assert(cpu.getRegister("X") === 0x42, "LDX test failed, expected `0x42`, received " + hex(cpu.getRegister("X")));
    cpu.debugSet("PC", 0x000F);
    cpu.ldXY(cpu.immediate(), "Y");
    updateHtml();
    console.assert(cpu.getRegister("Y") === 0x42, "LDY test failed, expected `0x42`, received " + hex(cpu.getRegister("Y")));
}

function testLsr () {
    cpu.debugSet("PC", 0x000F);
    writeToMemory(0x000F, [0x01]);
    cpu.lsr(cpu.immediate(), true);
    updateHtml();
    console.assert(cpu.memory[0x000F] === 0x00, "LSR test failed, expected `0x00`, received " + hex(cpu.memory[0x000F]));
    console.assert(cpu.getFlag("C") === 1, "LSR Carry Flag test failed, expected `1`, received " + cpu.getFlag("C"));
    console.assert(cpu.getFlag("N") === 0, "LSR Negative Flag test failed, expected `0`, received " + cpu.getFlag("N"));
    console.assert(cpu.getFlag("Z") === 1, "LSR Zero Flag test failed, expected `1`, received " + cpu.getFlag("Z"));
}

function testOra () {
    cpu.debugSet("A", 0x55);
    cpu.debugSet("PC", 0x000F);
    writeToMemory(0x000F, [0xAA]);
    cpu.ora(cpu.immediate());
    updateHtml();
    console.assert(cpu.getRegister("A") === 0xFF, "ORA test failed, expected `0xFF`, received " + hex(cpu.getRegister("A")));
    console.assert(cpu.getFlag("N") === 1, "ORA Negative Flag test failed, expected `1`, received " + cpu.getFlag("N"));
    console.assert(cpu.getFlag("Z") === 0, "ORA Zero Flag test failed, expected `0`, received " + cpu.getFlag("Z"));
}

function testRol () {
    cpu.debugSet("PC", 0x000F);
    writeToMemory(0x000F, [0x81]);
    cpu.rol(cpu.immediate());
    updateHtml();
    console.assert(cpu.memory[0x000F] === 0x03, "ROL test failed, expected `0x03`, received " + hex(cpu.memory[0x000F]));
    console.assert(cpu.getFlag("C") === 1, "ROL Carry Flag test failed, expected `1`, received " + cpu.getFlag("C"));
    console.assert(cpu.getFlag("N") === 0, "ROL Negative Flag test failed, expected `0`, received " + cpu.getFlag("N"));
    console.assert(cpu.getFlag("Z") === 0, "ROL Zero Flag test failed, expected `0`, received " + cpu.getFlag("Z"));
    cpu.debugSet("A", 0x81);
    cpu.rol("A");
    updateHtml();
    console.assert(cpu.getRegister("A") === 0x03, "ROL Accumulator test failed, expected `0x03`, received " + hex(cpu.getRegister("A")));
    console.assert(cpu.getFlag("C") === 1, "ROL Accumulator Carry Flag test failed, expected `1`, received " + cpu.getFlag("C"));
    console.assert(cpu.getFlag("N") === 0, "ROL Accumulator Negative Flag test failed, expected `0`, received " + cpu.getFlag("N"));
    console.assert(cpu.getFlag("Z") === 0, "ROL Accumulator Zero Flag test failed, expected `0`, received " + cpu.getFlag("Z"));
}

function testRor () {
    cpu.debugSet("PC", 0x000F);
    writeToMemory(0x000F, [0x02]);
    cpu.ror(cpu.immediate());
    updateHtml();
    console.assert(cpu.memory[0x000F] === 0x01, "ROR test failed, expected `0x01`, received " + hex(cpu.memory[0x000F]));
    console.assert(cpu.getFlag("C") === 0, "ROR Carry Flag test failed, expected `0`, received " + cpu.getFlag("C"));
    console.assert(cpu.getFlag("N") === 0, "ROR Negative Flag test failed, expected `0`, received " + cpu.getFlag("N"));
    console.assert(cpu.getFlag("Z") === 0, "ROR Zero Flag test failed, expected `0`, received " + cpu.getFlag("Z"));
    cpu.debugSet("A", 0x02);
    cpu.ror("A");
    updateHtml();
    console.assert(cpu.getRegister("A") === 0x01, "ROR Accumulator test failed, expected `0x01`, received " + hex(cpu.getRegister("A")));
    console.assert(cpu.getFlag("C") === 0, "ROR Accumulator Carry Flag test failed, expected `0`, received " + cpu.getFlag("C"));
    console.assert(cpu.getFlag("N") === 0, "ROR Accumulator Negative Flag test failed, expected `0`, received " + cpu.getFlag("N"));
    console.assert(cpu.getFlag("Z") === 0, "ROR Accumulator Zero Flag test failed, expected `0`, received " + cpu.getFlag("Z"));
}

function testSbc () {
    cpu.debugSet("A", 0xFF);
    cpu.debugSet("PC", 0x000F);
    cpu.debugSet("C", 1);
    writeToMemory(0x000F, [0x0F]);
    cpu.sbc(cpu.immediate());
    updateHtml();
    console.assert(cpu.getRegister("A") === 0xEF, "SBC test failed, expected `0xEF`, received " + hex(cpu.getRegister("A")));
    console.assert(cpu.getFlag("C") === 1, "SBC Carry Flag test failed, expected `1`, received " + cpu.getFlag("C"));
    console.assert(cpu.getFlag("N") === 1, "SBC Negative Flag test failed, expected `1`, received " + cpu.getFlag("N"));
    console.assert(cpu.getFlag("V") === 0, "SBC Overflow Flag test failed, expected `0`, received " + cpu.getFlag("V"));
    console.assert(cpu.getFlag("Z") === 0, "SBC Zero Flag test failed, expected `0`, received " + cpu.getFlag("Z"));
}

function testStAXY() {
    cpu.debugSet("A", 0x42);
    cpu.debugSet("X", 0x84);
    cpu.debugSet("Y", 0xC6);
    cpu.debugSet("PC", 0x000F);
    writeToMemory(0x000F, [0x17]);
    cpu.stAXY(cpu.zeroPage(), "A");
    updateHtml();
    console.assert(cpu.memory[0x0017] === 0x42, "STAX test failed, expected `0x42` at address `0x0017`, received " + hex(cpu.memory[0x0017]));
    cpu.debugSet("PC", 0x000F);
    cpu.stAXY(cpu.zeroPage(), "X");
    updateHtml();
    console.assert(cpu.memory[0x0017] === 0x84, "STX test failed, expected `0x84` at address `0x0017`, received " + hex(cpu.memory[0x0017]));
    cpu.debugSet("PC", 0x000F);
    cpu.stAXY(cpu.zeroPage(), "Y");
    updateHtml();
    console.assert(cpu.memory[0x0017] === 0xC6, "STY test failed, expected `0xC6` at address `0x0017`, received " + hex(cpu.memory[0x0017]));
}

function testTransferRegisters () {
    cpu.debugSet("A", 0x42);
    cpu.transReg("A", "X");
    updateHtml();
    console.assert(cpu.getRegister("X") === 0x42, "transReg A to X test failed, expected `0x42`, received " + hex(cpu.getRegister("X")));
    cpu.debugSet("X", 0x84);
    cpu.transReg("X", "SP");
    updateHtml();
    console.assert(cpu.getRegister("SP") === 0x84, "transReg X to SP test failed, expected `0x84`, received " + hex(cpu.getRegister("SP")));
    cpu.debugSet("SP", 0x08);
    cpu.transReg("SP", "X");
    updateHtml();
    console.assert(cpu.getRegister("X") === 0x08, "transReg SP to X test failed, expected `0x08`, received " + hex(cpu.getRegister("X")));
    cpu.debugSet("Y", 0xC6);
    cpu.transReg("Y", "A");
    updateHtml();
    console.assert(cpu.getRegister("A") === 0xC6, "transReg Y to A test failed, expected `0xC6`, received " + hex(cpu.getRegister("A")));
}

function runFunctionTests() {
    testImmediateAddress();
    testZeroPageAddress();
    testZeroPageIndexedAddress();
    testAbsoluteAddress();
    testAbsoluteXYAddressNoPage();
    testAbsoluteXYAddressPage();
    testIndirectXAddress();
    testIndirectYAddressNoPage();
    testIndirectYAddressPage();
    testADC();
    testAND();
    testASL();
    testCMP();
    testCPX();
    testDecInc();
    testPush();
    testPop();
    testDecIncXY();
    testEor();
    testLda();
    testLdxy();
    testLsr();
    testOra();
    testRol();
    testSbc();
    testStAXY();
    testTransferRegisters();
}

function testCommands() {
    cpu.debugSet("A", 0xD0);
    cpu.debugSet("PC", 0x008F);
    cpu.debugSet("C", 1);
    writeToMemory(0x008F, [0x00, 0x7F]);  // BRK
    writeToMemory(0x007F, [0xAA]);
    cpu.step();
    updateHtml();
    const statusFlags = cpu.pop();
    const lowByte = cpu.pop();
    const highByte = cpu.pop();
    console.assert(lowByte === 0x91, "BRK test failed, expected `" + hex(0x91, 2) + "`, received " + hex(lowByte, 2));
    console.assert(highByte === 0x00, "BRK test failed, expected `" + hex(0x00, 2) + "`, received " + hex(highByte, 2));
    console.assert(statusFlags === cpu.getFlags()[7], "BRK test failed, expected `" + hex(cpu.getFlags()[7], 2) + "`, received " + hex(statusFlags, 2));
}


function runInstructionTests() {
    testCommands();
}

runInstructionTests();


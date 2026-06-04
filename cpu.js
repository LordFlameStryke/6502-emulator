import { OPCODES } from "./cpuInstructions.js";

const FLAGS = Object.freeze({
    C: 0b00000001,  // Carry flag
    Z: 0b00000010,  // Zero flag
    I: 0b00000100,  // Interrupt Disable flag
    D: 0b00001000,  // Decimal Mode flag
    B: 0b00010000,  // Break Command flag
    U: 0b00100000,  // Unused flag
    V: 0b01000000,  // Overflow flag
    N: 0b10000000,   // Negative flag
});

const SPECIAL_VECTORS = Object.freeze({
    NMI: 0xFFFA,
    RESET: 0xFFFC,
    IRQ: 0xFFFE,
});

export class CPU {
    #P = new Uint8Array(0x01);  // Flags register, use P instead of "flags" for consistencey with 6502 documentation, even though it is technically not a single register but a collection of bits representing different flags
    #A = new Uint8Array(0x01);  // Accumulator
    #SP = new Uint8Array(0x01);  // Stack Pointer
    #X = new Uint8Array(0x01);  // X register
    #Y = new Uint8Array(0x01);  // Y register
    #PC = new Uint16Array(0x01);  // Program Counter
    #halted = false;  // Flag to indicate if the CPU is halted (used for HLT instruction)
    // zero page uses memory addresses 0x0000 to 0x00FF
    // stack uses memory addresses 0x0100 to 0x01FF
    // special vectors are stored at the end of memory, with the reset vector at 0xFFFC and 0xFFFD, the interrupt request (IRQ) vector at 0xFFFE and 0xFFFF, and the non-maskable interrupt (NMI) vector at 0xFFFA and 0xFFFB
    // memory page 0xFF00 to 0xFFFF is reserved for these special vectors and should not be used for general memory storage, as it may cause conflicts with the CPU's operation and interrupt handling
    // the rest of the memory (0x0200 to 0xFEFF) can be used for general storage and program code


    constructor (bus, {startAddr = SPECIAL_VECTORS.RESET, debugMode = false} = {}) {
        this.bus = bus;
        this.startAddr = startAddr;  // start address of Program Counter, defaults to 0xFFFC, which is the reset vector for the 6502 CPU
        this.debugMode = debugMode; // if true, allows for manually setting register and flag values for testing purposes, and logs executed instructions and their effects on the CPU state
        this.powerOn();
    }

    powerOn() {
        this.#A[0] = 0x00;
        this.#X[0] = 0x00;
        this.#Y[0] = 0x00;
        this.#P[0] = 0x04; // Set Interrupt Disable flag, all other flags remain the same
        this.#SP[0] = 0xFD;
        this.#PC[0] = this.bus.read(this.startAddr) | this.bus.read(this.startAddr + 1) << 8;
    }

    reset() {
        this.#P[0] |= 0x04; // Set Interrupt Disable flag, reset all other flags
        this.#SP[0] -= 3;  // Set stack pointer to 0xFD, which is the default value after reset, as the first two bytes of the stack (0x01FF and 0x01FE) are used to store the return address when an interrupt occurs, and the next byte (0x01FD) is used to store the processor status register, so the stack pointer starts at 0xFD to avoid overwriting these values during normal operation
        this.#PC[0] = this.bus.read(this.startAddr) | this.bus.read(this.startAddr + 1) << 8;
        if (this.#PC[0] === 0x0000) this.#PC[0] = 0x8000;
        this.#halted = false;
    }

    // flag functions
    getFlag(flag) {
        switch (flag) {
            case "C":
                flag = FLAGS.C;
                break;
            case "Z":
                flag = FLAGS.Z;
                break;
            case "I":
                flag = FLAGS.I;
                break;
            case "D":
                flag = FLAGS.D;
                break;
            case "B":
                flag = FLAGS.B;
                break;
            case "U":
                flag = FLAGS.U;
                break;
            case "V":
                flag = FLAGS.V;
                break;
            case "N":
                flag = FLAGS.N;
                break;
        }
        return (this.#P[0] & flag) ? 1 : 0;
    }

    setFlag(flag, value) {
        if (value) {
            this.#P[0] |= flag;  // turn bit ON
        } else {
            this.#P[0] &= ~flag;  // turn bit OFF
        }
    }

    getFlags() {
        let temp = [];
        temp.push(this.getFlag(FLAGS.C));
        temp.push(this.getFlag(FLAGS.Z));
        temp.push(this.getFlag(FLAGS.I));
        temp.push(this.getFlag(FLAGS.D));
        temp.push(this.getFlag(FLAGS.B));
        temp.push(this.getFlag(FLAGS.V));
        temp.push(this.getFlag(FLAGS.N));
        temp.push(this.#P[0]);
        return temp;
    }

    // register functions
    getRegister(register) {
        switch (register) {
            case 'A':
                return this.#A[0];
            case 'X':
                return this.#X[0];
            case 'Y':
                return this.#Y[0];
            case 'PC':
                return this.#PC[0];
            case 'SP':
                return this.#SP[0];
            case 'P':
                return this.#P[0];
        }
    }

    getRegisters() {
        let temp = [];
        temp.push(this.#A[0]);
        temp.push(this.#X[0]);
        temp.push(this.#Y[0]);
        temp.push(this.#PC[0]);
        temp.push(this.#SP[0]);
        temp.push(this.bus.readCycles());
       return temp;
    }

    // debug functions
    debugSet(addr, value) {
        if (!this.debugMode) {
            throw new Error("Debug mode is not enabled");
        }
        switch (addr) {
        case "A": 
            this.#A[0] = value & 0xFF;  // Ensure only the least significant byte is stored in the register
            break;
        case "X":
            this.#X[0] = value & 0xFF;  // Ensure only the least significant byte is stored in the register
            break;
        case "Y":
            this.#Y[0] = value & 0xFF;  // Ensure only the least significant byte is stored in the register
            break;
        case "PC":
            this.#PC[0] = value & 0xFFFF;  // Ensure only the least significant 16 bits is stored in the program counter
            break;
        case "SP":
            this.#SP[0] = value & 0xFF;  // Ensure only the least significant byte is stored in the stack pointer
            break;
        case "C":
            this.setFlag(FLAGS.C, value & 0x01);
            break;
        case "Z":
            this.setFlag(FLAGS.Z, value & 0x01);
            break;
        case "I":
            this.setFlag(FLAGS.I, value & 0x01);
            break;
        case "D":
            this.setFlag(FLAGS.D, value & 0x01);
            break;
        case "B":
            this.setFlag(FLAGS.B, value & 0x01);
            break;
        case "U":
            this.setFlag(FLAGS.U, value & 0x01);
            break;
        case "V":
            this.setFlag(FLAGS.V, value & 0x01);
            break;
        case "N":
            this.setFlag(FLAGS.N, value & 0x01);
            break;
        default:
            console.warn("Invalid register or flag name, use 'A', 'X', 'Y', 'PC', or 'SP' for registers, and 'C', 'Z', 'I', 'D', 'B', 'U', 'V', or 'N' for flags");
        }
    }
  
    
    setRegister(register, value) { // NEVER USE THIS, EXCEPT FOR TESTING PURPOSES, use debugSet() as it will fail if not in debug mode, setRegister will never fail
        switch (register) {
            case 'A':
                this.#A[0] = value & 0xFF;  // Ensure only the least significant byte is stored in the register
                break;
            case 'X':
                this.#X[0] = value & 0xFF;  // Ensure only the least significant byte is stored in the register
                break;
            case 'Y':
                this.#Y[0] = value & 0xFF;  // Ensure only the least significant byte is stored in the register
                break;
            case 'PC':
                this.#PC[0] = value & 0xFFFF;  // Ensure only the least significant 16 bits are stored in the program counter
                break;
            case 'SP':
                this.#SP[0] = value & 0xFF;  // Ensure only the least significant byte is stored in the stack pointer
                break;
            case 'P':
                this.#P[0] = value & 0xFF;   // Ensure only the least significant byte is stored in the flag register
        }
    }

    // stack operations
    push (value) {
        this.bus.write(0x0100 + this.#SP[0], value);
        this.#SP[0] = (this.#SP[0] - 1) & 0xFF;  // Decrement stack pointer and wrap around at 0x00
        if (this.#SP[0] === 0xFF) {
            console.warn("Stack overflow: Stack pointer wrapped around to 0xFF");
        }
    }

    pop () {
        this.#SP[0] = (this.#SP[0] + 1) & 0xFF;  // Increment stack pointer and wrap around at 0x00
        if (this.#SP[0] === 0x00) {
            console.warn("Stack underflow: Stack pointer wrapped around to 0x00");
        }
        return this.bus.read(0x0100 + this.#SP[0]);  // Read value from stack and return it
    }

    // utility functions
    blockMove() {
        let source = Uint16Array[1];
        let dest = Uint16Array[1];
        this.#A[0] = this.getMemory[this.#PC++];
        this.#X[0] = this.getMemory[this.#PC++];
        this.#Y[0] = this.getMemory[this.#PC++];
        source[0] = (this.#X[0] << 8) | 0x00;
        dest = (this.#Y[0] << 8) | 0x00;
        let c = 0;
        for (let i = 0; i < this.#A[0]; i++) {
            this.getMemory[dest[0]++] = this.getMemory[source[0]++];
            c += 7;
        }
        return c; // blockMove returns the number of cycles
    }

    hex(value, digits = 2, prefix = true) {
        return prefix ? "0x" : "" + value.toString(16).toUpperCase().padStart(digits, '0');
    }

    step() {
        if (!this.#halted) {
            this.getInstruction();
        } else {
            console.log("CPU is halted. Reset the CPU to continue execution.");
        }
    }

    twosComplement(value) {
        return (value ^ 0xFF) + 1;
    }

    // Addressing modes
    immediate () {
        return this.#PC[0]++;
    }

    zeroPage () {
        return this.bus.read(this.#PC[0]++);
    }

    zeroPageIndexed (index) {
        const base = this.bus.read(this.#PC[0]++);
        return (base + index) & 0xFF;  // Wrap around zero page
    }

    absolute () {
        const lowByte = this.bus.read(this.#PC[0]++);
        const highByte = this.bus.read(this.#PC[0]++);
        return lowByte | (highByte << 8);
    }

    absoluteXY (registerValue) {
        const highByte = this.bus.read(this.#PC[0] + 1);
        const addr = (this.absolute() + registerValue) & 0xFFFF;
        const newHighByte = ((addr & 0xFF00) >> 8);
        const tuple = { "addr": addr, "pageCrossed": newHighByte !== highByte ? 1 : 0 };
        return tuple;
    }

    indirectX () {
        const zpl = this.zeroPageIndexed(this.#X[0]);
        const lowByte = this.bus.read(zpl);
        const highByte = this.bus.read((zpl + 1) & 0xFF);
        return lowByte | (highByte << 8);
    }

    indirectY () {
        const zpl = this.zeroPage();
        const lowByte = this.bus.read(zpl);
        const highByte = this.bus.read((zpl + 1) & 0xFF);
        let addr = lowByte | (highByte << 8);
        addr = (addr + this.#Y[0]) & 0xFFFF;
        const newHighByte = ((addr & 0xFF00) >> 8);
        const tuple = { "addr": addr, "pageCrossed": newHighByte !== highByte ? 1 : 0 };
        return tuple;
    }


    // operation functions
    adc(addr) {
        const value = this.bus.read(addr);  // Add carry flag to the value being added
        const oldA = this.#A[0];
        const tempA = this.#A[0] + value + this.getFlag(FLAGS.C);
        this.#A[0] = tempA & 0xFF;
        this.setFlag(FLAGS.C, ((!this.getFlag(FLAGS.D) && tempA > 0xFF) || (this.getFlag(FLAGS.D) && tempA > 99)) ? 1 : 0);
        this.setFlag(FLAGS.N, ((this.#A[0] & 0x80) === 0) ? 0 : 1);
        this.setFlag(FLAGS.V, ((oldA & 0x80) ^ (tempA & 0x80) & !((oldA & 0x80) ^ (value & 0x80))) ? 1 : 0);
        this.setFlag(FLAGS.Z, (this.#A[0] === 0) ? 1 : 0);
    }

    and(addr) {
        const value = this.bus.read(addr);
        this.#A[0] = this.#A[0] & value;
        this.setFlag(FLAGS.N, ((this.#A[0] & 0x80) === 0) ? 0 : 1);
        this.setFlag(FLAGS.Z, (this.#A[0] === 0) ? 1 : 0);
    }

    asl(addr, acc = false, value = 0) {
        if (!acc) {
            value = this.bus.read(addr);
            this.bus.write(addr, value << 1 & 0xFF);
        } else {
            value = this.#A[0];
            this.#A[0] = value << 1 & 0xFF;
        }
        this.setFlag(FLAGS.C, (value & 0x80) >> 7 ? 1 : 0);
        this.setFlag(FLAGS.N, ((value << 1) & 0x80) >> 7 ? 1 : 0);
        this.setFlag(FLAGS.Z, ((value << 1) & 0xFF) === 0 ? 1 : 0);
    }

    cmp(addr) {
        const value = this.bus.read(addr);
        this.setFlag(FLAGS.C, (this.#A[0] >= value) ? 1 : 0);
        this.setFlag(FLAGS.N, ((this.#A[0] - value) & 0x80) ? 1 : 0);
        this.setFlag(FLAGS.Z, (this.#A[0] === value) ? 1 : 0);
    }

    cpx_y(register, addr) {
        const value = this.bus.read(addr);
        this.setFlag(FLAGS.Z, (register === value) ? 1 : 0);
        this.setFlag(FLAGS.N, ((register - value) & 0x80) ? 1 : 0);
        this.setFlag(FLAGS.C, (register >= value) ? 1 : 0);
    }

    decInc (addr, direction) {
        if (direction) {
            this.bus.write(addr, this.bus.read(addr) + 1);
        } else {
            this.bus.write(addr, this.bus.read(addr) - 1);
        }
        const value = this.bus.read(addr);
        this.setFlag(FLAGS.Z, (value === 0) ? 1 : 0);
        this.setFlag(FLAGS.N, (value & 0x80) ? 1 : 0);
    }

    decIncXY (register, direction) {
        if (direction) {
            if (register === "X") {
                this.#X[0]++;
                register = this.#X[0];
            } else {
                this.#Y[0]++;
                register = this.#Y[0];
            }
        } else {
            if (register === "X") {
                this.#X[0]--;
                register = this.#X[0];
            } else {
                this.#Y[0]--;
                register = this.#Y[0];
            }
        }
        this.setFlag(FLAGS.Z, (register === 0) ? 1 : 0);
        this.setFlag(FLAGS.N, (register & 0x80) ? 1 : 0);
    }

    eor (addr) {
        const value = this.bus.read(addr);
        this.#A[0] = this.#A[0] ^ value;
        this.setFlag(FLAGS.N, ((this.#A[0] & 0x80) === 0) ? 0 : 1);
        this.setFlag(FLAGS.Z, (this.#A[0] === 0) ? 1 : 0);
    }

    lda (addr) {
        this.#A[0] = this.bus.read(addr);
        this.setFlag(FLAGS.N, ((this.#A[0] & 0x80) === 0) ? 0 : 1);
        this.setFlag(FLAGS.Z, (this.#A[0] === 0) ? 1 : 0);
    }

    ldXY (addr, register) {
        if (register === "X") {
            register = this.bus.read(addr);
            this.#X[0] = register;
        } else {
            register = this.bus.read(addr);
            this.#Y[0] = register;
        }
        this.setFlag(FLAGS.N, ((register & 0x80) === 0) ? 0 : 1);
        this.setFlag(FLAGS.Z, (register === 0) ? 1 : 0);

    }

    lsr (addr) {
        let value = this.bus.read(addr);
        this.setFlag(FLAGS.C, value & 0x01);
        value = value >> 1;
        this.bus.write(addr, value);
        this.setFlag(FLAGS.Z, (value === 0) ? 1 : 0);
        this.setFlag(FLAGS.N, ((value & 0x80) >> 7) === 1 ? 1 : 0);
    }

    lsrA () {
        let value = this.#A[0];
        this.setFlag(FLAGS.C, value & 0x01);
        value = value >> 1;
        this.#A[0] = value;
        this.setFlag(FLAGS.Z, (value === 0) ? 1 : 0);
        this.setFlag(FLAGS.N, ((value & 0x80) >> 7) === 1 ? 1 : 0);
    }

    ora(addr) {
        const value = this.bus.read(addr);
        this.#A[0] = this.#A[0] | value;
        this.setFlag(FLAGS.N, ((this.#A[0] & 0x80) >> 7));
        this.setFlag(FLAGS.Z, (this.#A[0] === 0) ? 1 : 0);
    }

    rol(addr) {
        let value;
        if (addr === "A") {
            value = this.#A[0];
        } else {
            value = this.bus.read(addr);
        }
        const carry = this.getFlag(FLAGS.C);
        this.setFlag(FLAGS.C, (value & 0x80) >> 7);
        value = ((value << 1) & 0xFF) | carry;
        if (addr === "A") {
            this.#A[0] = value;
        } else {
            this.bus.write(addr, value);
        }
        this.setFlag(FLAGS.Z, (value === 0) ? 1 : 0);
        this.setFlag(FLAGS.N, (value & 0x80) >> 7);
    }

    ror(addr) {
        let value;
        if (addr === "A") {
            value = this.#A[0];
        } else {
            value = this.bus.read(addr);
        }
        const carry = this.getFlag(FLAGS.C);
        this.setFlag(FLAGS.C, (value & 0x01));
        value = ((value >> 1) & 0xFF) | (carry << 7);
        if (addr === "A") {
            this.#A[0] = value;
        } else {
            this.bus.write(addr, value);
        }
        this.setFlag(FLAGS.Z, (value === 0) ? 1 : 0);
        this.setFlag(FLAGS.N, (value & 0x80) >> 7);
    }

    sbc(addr) {
        const value = this.bus.read(addr);  // Add carry flag to the value being added
        const oldA = this.#A[0];
        const tempA = this.#A[0] - value - (1 - this.getFlag(FLAGS.C));
        this.#A[0] = tempA & 0xFF;
        this.setFlag(FLAGS.C, (tempA < 0) ? 1 : 0);
        this.setFlag(FLAGS.N, (tempA & 0x80) === 0 ? 0 : 1);
        this.setFlag(FLAGS.V, ((oldA & 0x80) ^ (tempA & 0x80) & !((oldA & 0x80) ^ (value & 0x80))) ? 1 : 0);
        this.setFlag(FLAGS.Z, (tempA === 0) ? 1 : 0);
    }

    stAXY(addr, register) {
        switch (register) {
            case "A":
                this.bus.write(addr, this.#A[0]);
                break;
            case "X":
                this.bus.write(addr, this.#X[0]);
                break;
            case "Y":
                this.bus.write(addr, this.#Y[0]);
                break;
        }
    }

    transReg (srcReg, destReg) {
        switch (srcReg) {
            case "A":
                switch (destReg) {
                    case "X":
                        this.#X[0] = this.#A[0];
                        break;
                    case "Y":
                        this.#Y[0] = this.#A[0];
                        break;
                    case "SP":
                        this.#SP[0] = this.#A[0];
                        break;
                    default:
                        console.warn(`Invalid destination:  Source ${srcReg}, Destination ${destReg}.`)
                }
                break;
            case "X":
                switch (destReg) {
                    case "A":
                        this.#A[0] = this.#X[0];
                        break;
                    case "Y":
                        this.#Y[0] = this.#X[0];
                        break;
                    case "SP":
                        this.#SP[0] = this.#X[0];
                        break;
                    default:
                        console.warn(`Invalid destination:  Source ${srcReg}, Destination ${destReg}.`)
                }
                break;
            case "Y":
                switch (destReg) {
                    case "A":
                        this.#A[0] = this.#Y[0];
                        break;
                    case "X":
                        this.#X[0] = this.#Y[0];
                        break;
                    case "SP":
                        this.#SP[0] = this.#Y[0];
                        break;
                    default:
                        console.warn(`Invalid destination:  Source ${srcReg}, Destination ${destReg}.`)
                }
                break;
            case "SP":
                switch (destReg) {
                    case "A":
                        this.#A[0] = this.#SP[0];
                        break;
                    case "X":
                        this.#X[0] = this.#SP[0];
                        break;
                    case "Y":
                        this.#Y[0] = this.#SP[0];
                        break;
                    default:
                        console.warn(`Invalid destination:  Source ${srcReg}, Destination ${destReg}.`)
                }
                break;
            default:
                console.warn(`Invalid source:  Source ${srcReg}, Destination ${destReg}.`)
        }
        switch (destReg) {
            case "A":
                this.setFlag(FLAGS.N, ((this.#A[0] & 0x80) === 0) ? 0 : 1);
                this.setFlag(FLAGS.Z, (this.#A[0] === 0) ? 1 : 0);
                break;
            case "X":
                this.setFlag(FLAGS.N, ((this.#X[0] & 0x80) === 0) ? 0 : 1);
                this.setFlag(FLAGS.Z, (this.#X[0] === 0) ? 1 : 0);
                break;
            case "Y":
                this.setFlag(FLAGS.N, ((this.#Y[0] & 0x80) === 0) ? 0 : 1);
                this.setFlag(FLAGS.Z, (this.#Y[0] === 0) ? 1 : 0);
                break;
            case "SP":
                this.setFlag(FLAGS.N, ((this.#SP[0] & 0x80) === 0) ? 0 : 1);
                this.setFlag(FLAGS.Z, (this.#SP[0] === 0) ? 1 : 0);
                break;
            default:
                console.warn(`Invalid destination:  Source ${srcReg}, Destination ${destReg}.`)
        }
    }

    // run the emulator
    getInstruction() {
        const startPC = this.#PC[0];
        const instruction = this.bus.read(this.#PC[0]++);
        cycles = this.runInstruction(instruction);
        this.bus.incrementCycles(cycles);
        console.log(`Executed instruction ${this.hex(instruction)} at address ${this.hex(startPC, 4)} took ${cycles} cycles. Total cycles: ${this.bus.readCycles()}.  Program counter now at ${this.hex(this.#PC[0], 4)}`);
    }

    runInstruction(instructionCode) {
        let cycles = 0;
        switch (instructionCode) {

            // Add with Carry (ADC) instructions
            case OPCODES.ADC_Immediate: {
                this.adc(this.immediate());
                cycles = 2;  // ADC Immediate takes 2 cycles
                break;
            }
            case OPCODES.ADC_Zero_Page: {
                this.adc(this.zeroPage());
                cycles = 3;  // ADC Zero Page takes 3 cycles
                break;
            }
            case OPCODES.ADC_Zero_Page_X: {
                this.adc(this.zeroPageIndexed(this.#X[0]));
                cycles = 4;   // ADC Zero Page,X takes 4 cycles
                break;
            }
            case OPCODES.ADC_Absolute: {
                this.adc(this.absolute());
                cycles = 4;  // ADC Absolute takes 4 cycles
                break;
            }
            case OPCODES.ADC_Absolute_X: {
                const tuple = this.absoluteXY(this.#X[0]);
                this.adc(tuple.addr);
                cycles = 4 + tuple.pageCrossed;  // ADC Absolute,Y takes 4 cycles
                break;
            }
            case OPCODES.ADC_Absolute_Y: {
                const tuple = this.absoluteXY(this.#Y[0]);
                this.adc(tuple.addr);
                cycles = 4 + tuple.pageCrossed;  // ADC Absolute,Y takes 4 cycles
                break;
            }
            case OPCODES.ADC_Indirect_X: {
                this.adc(this.indirectXY(this.#X[0]));
                cycles = 6;  // ADC Indirect,X takes 6 cycles
                break;
            }
            case OPCODES.ADC_Indirect_Y: {
                const tuple = this.indirectY(this.#Y[0]);
                this.adc(tuple.addr);
                cycles = 5 + tuple.pageCrossed;  // ADC Absolute,Y takes 4 cycles
                break;
            }

            // Logical AND (AND) instructions
            case OPCODES.AND_Immediate: {
                const addr = this.immediate();
                this.and(addr);
                cycles = 2;  // AND Immediate takes 2 cycles
                break;
            }
            case OPCODES.AND_Zero_Page: {
                this.and(this.zeroPage());
                cycles = 3;  // AND Zero Page takes 3 cycles
                break;
            }
            case OPCODES.AND_Zero_Page_X: {
                this.and(this.zeroPageIndexed(this.#X[0]));
                cycles = 4;  // AND Zero Page, X takes 4 cycles
                break;
            }
            case OPCODES.AND_Absolute: {
                this.and(this.absolute());
                cycles = 4;  // AND Absolute takes 4 cycles
                break;
            }
            case OPCODES.AND_Absolute_X: {
                const tuple = this.absoluteXY(this.#X[0]);
                this.and(tuple.addr);
                cycles = 4 + tuple.pageCrossed;  // AND Absolute, X takes 4 cycles
                break;
            }
            case OPCODES.AND_Absolute_Y: {
                const tuple = this.absoluteXY(this.#Y[0]);
                this.and(tuple.addr);
                cycles = 4 + tuple.pageCrossed;  // AND Absolute, Y takes 4 cycles
                break;
            }
            case OPCODES.AND_Indirect_X: {
                this.and(this.indirectX());
                cycles = 6;  // AND Indirect, X takes 6 cycles
                break;
            }
            case OPCODES.AND_Indirect_Y: {
                const tuple = this.indirectY();
                this.and(tuple.addr);
                cycles = 5 + tuple.pageCrossed;  // AND Indirect, Y takes 5 cycles
                break;
            }

            // Arithmetic Shift Left (ASL) instructions
            case OPCODES.ASL_Accumulator: {
                const value = this.asl(this.#A[0], true);
                cycles = 2;  // ASL Accumulator takes 2 cycles
                break;
            }
            case OPCODES.ASL_Zero_Page: {
                const addr = this.bus[this.#PC[0]++];
                this.asl(addr);
                cycles = 5;  // ASL Zero Page takes 5 cycles
                break;
            }
            case OPCODES.ASL_Zero_Page_X: {
                const addr = (this.bus[this.zeroPageIndexed(this.#X[0])]) & 0xFF;
                this.asl(addr);
                cycles = 6;  // ASL Zero Page, X takes 6 cycles
                break;
            }
            case OPCODES.ASL_Absolute: {
                const addr = this.bus[this.absolute()];
                this.asl(addr);
                cycles = 6;  // ASL Absolute takes 6 cycles
                break;
            }
            case OPCODES.ASL_Absolute_X: {
                const addr = this.absoluteXY(this.#X[0]);
                this.asl(addr);
                cycles = 7;  // ASL Absolute, X takes 7 cycles
                break;
            }

            // Branch if Carry Clear (BCC) instruction
            case OPCODES.BCC: {
                const value = this.bus[this.immediate()];
                const oldPC = this.#PC[0];
                cycles = 2;  // BCC takes 2 cycles if branch not taken
                if (!this.getFlag(FLAGS.C)) {
                    this.#PC[0] += (value < 0x80) ? value : value - 0x100;
                    this.#PC[0] &= 0xFFFF;  // Ensure program counter wraps around at 16 bits
                    cycles += 1;  // Add 1 cycle if branch is taken
                    if (((this.#PC[0] & 0xFF00) !== (oldPC & 0xFF00))) {
                        cycles += 1;  // Add 1 cycle if page boundary is crossed
                    }
                }
                break;
            }

            // Branch if Carry Set (BCS) instruction
            case OPCODES.BCS: {
                const value = this.bus[this.immediate()];
                const oldPC = this.#PC[0];
                cycles = 2;  // BCS takes 2 cycles if branch not taken
                if (this.getFlag(FLAGS.C)) {
                    this.#PC[0] += (value < 0x80) ? value : value - 0x100;
                    this.#PC[0] &= 0xFFFF;  // Ensure program counter wraps around at 16 bits
                    cycles += 1;  // Add 1 cycle if branch is taken
                    if (((this.#PC[0] & 0xFF00) !== (oldPC & 0xFF00))) {
                        cycles += 1;  // Add 1 cycle if page boundary is crossed
                    }
                }
                break;
            }

            // Branch if Equal (BEQ) instruction
            case OPCODES.BEQ: {
                const value = this.bus[this.immediate()];
                const oldPC = this.#PC[0];
                cycles = 2;  // BEQ takes 2 cycles if branch not taken
                if (this.getFlag(FLAGS.Z)) {
                    this.#PC[0] += (value < 0x80) ? value : value - 0x100;
                    this.#PC[0] &= 0xFFFF;  // Ensure program counter wraps around at 16 bits
                    cycles += 1;  // Add 1 cycle if branch is taken
                    if (((this.#PC[0] & 0xFF00) !== (oldPC & 0xFF00))) {
                        cycles += 1;  // Add 1 cycles if page boundary is crossed
                    }
                }
                break;
            }

            // Bit Test (BIT) instructions
            case OPCODES.BIT_Zero_Page: {
                const addr = this.bus[this.#PC[0]++];
                const value = this.bus[addr];
                const operand = this.#A[0] & value;
                this.setFlag(FLAGS.N, (value & 0x80) >> 7);
                this.setFlag(FLAGS.V, (value & 0x40) >> 6);
                this.setFlag(FLAGS.Z, (operand === 0) ? 1 : 0);
                cycles = 3;  // BIT Zero Page takes 3 cycles
                break;
            }
            case OPCODES.BIT_Absolute: {
                const addr = this.absolute();
                const value = this.bus[addr];
                const operand = this.#A[0] & value;
                this.setFlag(FLAGS.N, (value & 0x80) >> 7);
                this.setFlag(FLAGS.V, (value & 0x40) >> 6);
                this.setFlag(FLAGS.Z, (operand === 0) ? 1 : 0);
                cycles = 4;  // BIT Absolute takes 4 cycles
                break;
            }

            // Branch if Minus (BMI) instruction
            case OPCODES.BMI: {
                const value = this.bus[this.immediate()];
                const oldPC = this.#PC[0];
                cycles = 2;  // BMI takes 2 cycles if branch not taken
                if (this.getFlag(FLAGS.N)) {
                    this.#PC[0] += (value < 0x80) ? value : value - 0x100;
                    this.#PC[0] &= 0xFFFF;  // Ensure program counter wraps around at 16 bits
                    cycles += 1;  // Add 1 cycle if branch is taken
                    if (((this.#PC[0] & 0xFF00) !== (oldPC & 0xFF00))) {
                        cycles += 1;  // Add 1 cycle if page boundary is crossed
                    }
                }
                break;
            }

            // Branch if Not Equal (BNE) instruction
            case OPCODES.BNE: {
                const value = this.bus[this.immediate()];
                const oldPC = this.#PC[0];
                cycles = 2;  // BNE takes 2 cycles if branch not taken
                if (!this.getFlag(FLAGS.Z)) {
                    this.#PC[0] += (value < 0x80) ? value : value - 0x100;
                    this.#PC[0] &= 0xFFFF;  // Ensure program counter wraps around at 16 bits
                    cycles += 1;  // Add 1 cycle if branch is taken
                    if (((this.#PC[0] & 0xFF00) !== (oldPC & 0xFF00))) {
                        cycles += 1;  // Add 1 cycle if page boundary is crossed
                    }
                }
                break;
            }

            // Branch if Positive (BPL) instruction
            case OPCODES.BPL: {
                const value = this.bus[this.immediate()];
                const oldPC = this.#PC[0];
                cycles = 2;  // BPL takes 2 cycles if branch not taken
                if (!this.getFlag(FLAGS.N)) {
                    this.#PC[0] += (value < 0x80) ? value : value - 0x100;
                    this.#PC[0] &= 0xFFFF;  // Ensure program counter wraps around at 16 bits
                    cycles += 1;  // Add 1 cycle if branch is taken
                    if (((this.#PC[0] & 0xFF00) !== (oldPC & 0xFF00))) {
                        cycles += 1;  // Add 1 cycle if page boundary is crossed
                    }
                }
                break;
            }

            // Break (BRK) instruction
            case OPCODES.BRK: {
                this.#PC[0]++;
                this.setFlag(FLAGS.B, 1);
                this.push((this.#PC[0] >> 8) & 0xFF);  // Push high byte of program counter
                this.push(this.#PC[0] & 0xFF);  // Push low byte of program counter
                this.push(this.#P[0]);  // Push status flags
                this.setFlag(FLAGS.I, 1);
                this.#PC[0] = this.bus[0xFFFE] | (this.bus[0xFFFF] << 8);
                cycles = 7;  // BRK takes 7 cycles
                break;
            }

            // Branch if Overflow Clear (BVC) instruction
            case OPCODES.BVC: {
                const value = this.bus[this.immediate()];
                const oldPC = this.#PC[0];
                cycles = 2;  // BVC takes 2 cycles if branch not taken
                if (!this.getFlag(FLAGS.V)) {
                    this.#PC[0] += (value < 0x80) ? value : value - 0x100;
                    this.#PC[0] = this.#PC[0] & 0xFFFF;  // Ensure program counter wraps around at 16 bits
                    cycles += 1;  // Add 1 cycle if branch is taken
                    if (((this.#PC[0] & 0xFF00) !== (oldPC & 0xFF00))) {
                        cycles += 1;  // Add 1 cycle if page boundary is crossed
                    }
                }
                break;
            }

            // Branch if Overflow Set (BVS) instruction
            case OPCODES.BVS: {
                const value = this.bus[this.immediate()];
                const oldPC = this.#PC[0];
                cycles = 2;  // BVS takes 2 cycles if branch not taken
                if (this.getFlag(FLAGS.V)) {
                    this.#PC[0] += (value < 0x80) ? value : value - 0x100;
                    this.#PC[0] &= 0xFFFF;  // Ensure program counter wraps around at 16 bits
                    cycles += 1;  // Add 1 cycle if branch is taken
                    if (((this.#PC[0] & 0xFF00) !== (oldPC & 0xFF00))) {
                        cycles += 1;  // Add 1 cycle if page boundary is crossed
                    }
                }
                break;
            }

            // Clear Carry (CLC) instruction
            case OPCODES.CLC: {
                this.setFlag(FLAGS.C, 0);
                cycles = 2;  // CLC takes 2 cycles
                break;
            }

            // Clear Decimal Mode (CLD) instruction
            case OPCODES.CLD: {
                this.setFlag(FLAGS.D, 0);
                cycles = 2;  // CLD takes 2 cycles
                break;
            }

            // Clear Interrupt Disable (CLI) instruction
            case OPCODES.CLI: {
                this.setFlag(FLAGS.I, 0);
                cycles = 2;  // CLI takes 2 cycles
                break;
            }

            // Clear Overflow (CLV) instruction
            case OPCODES.CLV: {
                this.setFlag(FLAGS.V, 0);
                cycles = 2;  // CLV takes 2 cycles
                break;
            }

            // Compare (CMP) instructions
            case OPCODES.CMP_Immediate:  {
                this.cmp(this.immediate());
                cycles = 2;  // CMP Immediate takes 2 cycles
                break;
            }
            case OPCODES.CMP_Zero_Page: {
                const addr = this.zeroPage();
                this.cmp(addr);
                cycles = 3;  // CMP Zero Page takes 3 cycles
                break;
            }
            case OPCODES.CMP_Zero_Page_X: {
                this.cmp(this.zeroPageIndexed(this.#X[0]));
                cycles = 4;  // CMP Zero Page, X takes 4 cycles
                break;
            }
            case OPCODES.CMP_Absolute: {
                this.cmp(this.absolute());
                cycles = 4;  // CMP Absolute takes 4 cycles
                break;
            }
            case OPCODES.CMP_Absolute_X: {
                const tuple = this.absoluteXY(this.#X[0]);
                this.cmp(tuple.addr);
                cycles = 4 + tuple.pageCrossed;  // CMP Absolute, X takes 4 cycles
                break;
            }
            case OPCODES.CMP_Absolute_Y: {
                const tuple = this.absoluteXY(this.#Y[0]);
                this.cmp(tuple.addr);
                cycles = 4 + tuple.pageCrossed;  // CMP Absolute, Y takes 4 cycles
                break;
            }
            case OPCODES.CMP_Indirect_X: {
                this.cmp(this.indirectX());
                cycles = 6;  // CMP Indirect, X takes 6 cycles
                break;
            }
            case OPCODES.CMP_Indirect_Y: {
                const tuple = this.indirectY();
                this.cmp(tuple.addr);
                cycles = 5 + tuple.pageCrossed;  // CMP Indirect, Y takes 5 cycles
                break;
            }

            // Compare X Register (CPX) instructions
            case OPCODES.CPX_Immediate: {
                this.cpx_y(this.#X[0], this.immediate());
                cycles = 2;  // CPX Immediate takes 2 cycles
                break;
            }
            case OPCODES.CPX_Zero_Page: {
                const addr = this.zeroPage();
                this.cpx_y(this.#X[0], addr);
                cycles = 3;  // CPX Zero Page takes 3 cycles
                break;
            }
            case OPCODES.CPX_Absolute: {
                this.cpx_y(this.#X[0], this.absolute());
                cycles = 4;  // CPX Absolute takes 4 cycles
                break;
            }

            // Compare Y Register (CPY) instructions
            case OPCODES.CPY_Immediate: {
                this.cpx_y(this.#Y[0], this.immediate());
                cycles = 2;  // CPY Immediate takes 2 cycles
                break;
            }
            case OPCODES.CPY_Zero_Page: {
                const addr = this.zeroPage();
                this.cpx_y(this.#Y[0], addr);
                cycles = 3;  // CPY Zero Page takes 3 cycles
                break;
            }
            case OPCODES.CPY_Absolute: {
                this.cpx_y(this.#Y[0], this.absolute());
                cycles = 4;  // CPY Absolute takes 4 cycles
                break;
            }

            // Decrement (DEC) instructions
            case OPCODES.DEC_Zero_Page: {
                const addr = this.zeroPage();
                this.decInc(addr, 0);
                cycles = 5;  // DEC Zero Page takes 5 cycles
                break;
            }
            case OPCODES.DEC_Zero_Page_X: {
                this.decInc(this.zeroPageX(), 0);
                cycles = 6;  // DEC Zero Page, X takes 6 cycles
                break;
            }
            case OPCODES.DEC_Absolute: {
                this.decInc(this.absolute(), 0);
                cycles = 6;  // DEC Absolute takes 6 cycles
                break;
            }
            case OPCODES.DEC_Absolute_X: {
                this.decInc(this.absoluteXY(this.#X[0]), 0);
                cycles = 7;  // DEC Absolute, X takes 7 cycles
                break;
            }

            // Decrement X Register (DEX) instruction
            case OPCODES.DEX: {
                this.decIncXY("X", 0);
                cycles = 2;  // DEX takes 2 cycles
                break;
            }

            // Decrement Y Register (DEY) instruction
            case OPCODES.DEY: {
                this.decIncXY("Y", 0);
                cycles = 2;  // DEY takes 2 cycles
                break;
            }

            // Exclusive OR (EOR) instructions
            case OPCODES.EOR_Immediate: {
                this.#A[0] = this.eor(this.immediate());
                cycles = 2;  // EOR Immediate takes 2 cycles
                break;
            }
            case OPCODES.EOR_Zero_Page: {
                const addr = this.zeroPage();
                this.#A[0] = this.eor(addr);
                cycles = 3;  // EOR Zero Page takes 3 cycles
                break;
            }
            case OPCODES.EOR_Zero_Page_X: {
                this.#A[0] = this.eor(this.zeroPageIndexed(this.#X[0]));
                cycles = 4;  // EOR Zero Page, X takes 4 cycles
                break;
            }
            case OPCODES.EOR_Absolute: {
                this.#A[0] = this.eor(this.absolute());
                cycles = 4;  // EOR Absolute takes 4 cycles
                break;
            }
            case OPCODES.EOR_Absolute_X: {
                const tuple = this.absoluteXY(this.#X[0]);
                this.#A[0] = this.eor(tuple.addr);
                cycles = 4 + tuple.pageCrossed;  // EOR Absolute, X takes 4 cycles
                break;
            }
            case OPCODES.EOR_Absolute_Y: {
                const tuple = this.absoluteXY(this.#Y[0]);
                this.#A[0] = this.eor(tuple.addr);
                cycles = 4 + tuple.pageCrossed;  // EOR Absolute, Y takes 4 cycles
                break;
            }
            case OPCODES.EOR_Indirect_X: {
                const tuple = this.indirectX();
                this.#A[0] = this.eor(tuple.addr);
                cycles = 6;  // EOR Indirect, X takes 6 cycles
                break;
            }
            case OPCODES.EOR_Indirect_Y: {
                const tuple = this.indirectY();
                this.#A[0] = this.eor(tuple.addr);
                cycles = 5 + tuple.pageCrossed;  // EOR Indirect, Y takes 5 cycles
                break;
            }

            // Increment (INC) instructions
            case OPCODES.INC_Zero_Page: {
                const addr = this.zeroPage();
                this.decInc(addr, 1);
                cycles = 5;  // INC Zero Page takes 5 cycles
                break;
            }
            case OPCODES.INC_Zero_Page_X: {
                const addr = (this.zeroPageIndexed(this.#X[0]));
                this.decInc(addr, 1);
                cycles = 6;  // INC Zero Page, X takes 6 cycles
                break;
            }
            case OPCODES.INC_Absolute: {
                const addr = this.absolute();
                this.decInc(addr, 1);
                cycles = 6;  // INC Absolute takes 6 cycles
                break;
            }
            case OPCODES.INC_Absolute_X: {
                const addr = this.absoluteXY(this.#X[0]);
                this.decInc(addr, 1);
                cycles = 7;  // INC Absolute, X takes 7 cycles
                break;
            }

            // Increment X Register (INX) instruction
            case OPCODES.INX: {
                this.decIncXY("X", 1);
                cycles = 2;  // INX takes 2 cycles
                break;
            }

            // Increment Y Register (INY) instruction
            case OPCODES.INY: {
                this.decIncXY("Y", 1);
                cycles = 2;  // INY takes 2 cycles
                break;
            }

            // Jump (JMP) instructions
            case OPCODES.JMP_Absolute: {
                this.#PC[0] = this.absolute();
                cycles = 3;
                break;
            }
            case OPCODES.JMP_Indirect: { 
                const lowByte = this.bus[this.#PC[0]++];
                const highByte = this.bus[this.#PC[0]++];
                const addr = this.bus[lowByte] | (this.bus[highByte] << 8);
                const newPCLow = this.bus[addr];
                const newPCHigh = this.bus[addr + 1];
                this.#PC[0] = newPCLow | (newPCHigh << 8);
                cycles = 5;
                break;
            }

            // Jump to Subroutine (JSR) instruction
            case OPCODES.JSR: {
                const lowByte = this.bus[this.#PC[0]++];
                const highByte = this.bus[this.#PC[0]++];
                const address = lowByte | (highByte << 8); 
                this.#PC[0]--;
                this.push(((this.#PC[0]--) >> 8) & 0xFF);  // Push high byte of return address onto stack
                this.push((this.#PC[0]--) & 0xFF);  // Push low byte of return address onto stack
                this.#PC[0] = address;
                cycles = 6;
                break;
            }

            // Load Accumulator (LDA) instructions
            case OPCODES.LDA_Immediate: {
                this.lda(this.immediate());
                cycles = 2;  // LDA Immediate takes 2 cycles
                break;
            }
            case OPCODES.LDA_Zero_Page: {
                this.lda(this.zeroPage());
                cycles = 3;
                break;
            }
            case OPCODES.LDA_Zero_Page_X: {
                this.lda(this.zeroPageIndexed(this.#X[0]));
                cycles = 4;
                break;
            }
            case OPCODES.LDA_Absolute: {
                this.lda(this.absolute());
                cycles = 4;
                break;
            }
            case OPCODES.LDA_Absolute_X: {
                const tuple = this.absoluteXY(this.#X[0]);
                this.lda(tuple.addr);
                cycles = 4 + tuple.pageCrossed;
                break;
            }
            case OPCODES.LDA_Absolute_Y: {
                const tuple = this.absoluteXY(this.#Y[0]);
                this.lda(tuple.addr);
                cycles = 4 + tuple.pageCrossed;
                break;
            }
            case OPCODES.LDA_Indirect_X: {
                this.lda(this.indirectX());
                cycles = 6;
                break;
            }
            case OPCODES.LDA_Indirect_Y: {
                const tuple = this.indirectY();
                this.lda(tuple.addr);
                cycles = 5 + tuple.pageCrossed;
                break;
            }

            // Load X Register (LDX) and Load Y Register (LDY) instructions
            case OPCODES.LDX_Immediate: {
                const addr = this.immediate();
                this.ldXY(addr, "X");
                cycles = 2;
                break;
            }
            case OPCODES.LDX_Zero_Page: {
                const addr = this.zeroPage();
                this.ldXY(addr, "X");
                cycles = 3;
                break;
            }
            case OPCODES.LDX_Zero_Page_Y: {
                const addr = this.zeroPageIndexed(this.#Y[0]);
                this.ldXY(addr, "X");
                cycles = 4;
                break;
            }
            case OPCODES.LDX_Absolute: {
                const addr = this.absolute();
                this.ldXY(addr, "X");
                cycles = 3;
                break;
            }
            case OPCODES.LDX_Absolute_Y: {
                const tuple = this.absoluteXY();
                this.ldXY(tuple.addr, "X");
                cycles = 3 + tuple.pageCrossed;
                break;
            }
            case OPCODES.LDY_Immediate: {
                const addr = this.immediate();
                this.ldXY(addr, "Y");
                cycles = 2;
                break;
            }
            case OPCODES.LDY_Zero_Page: {
                const addr = this.zeroPage();
                this.ldXY(addr, "Y");
                cycles = 3;
                break;
            }
            case OPCODES.LDY_Zero_Page_X: {
                const addr = this.zeroPageIndexed(this.#X[0]);
                this.ldXY(addr, "Y");
                cycles = 4;
                break;
            }
            case OPCODES.LDY_Absolute: {
                const addr = this.absolute();
                this.ldXY(addr, "Y");
                cycles = 2;
                break;
            }
            case OPCODES.LDY_Absolute_X: {
                const addr = this.absoluteXY(this.#X[0]);
                this.ldXY(addr, "Y");
                cycles = 2;
                break;
            }

            // Logical Shift Right (LSR) instructions
            case OPCODES.LSR_Accumulator: {
                this.lsrA();
                cycles = 2;
                break;
            }
            case OPCODES.LSR_Zero_Page: {
                const addr = this.zeroPage();
                this.lsr(addr);
                cycles = 5;
                break;
            }
            case OPCODES.LSR_Zero_Page_X: {
                const addr = this.zeroPageIndexed(this.#X[0]);
                this.lsr(addr);
                cycles = 6;
                break;
            }
            case OPCODES.LSR_Absolute: {
                const addr = this.absolute()
                this.lsr(addr);
                cycles = 6;
                break;
            }
            case OPCODES.LSR_Absolute_X: {
                const addr = this.absoluteXY(this.#X[0]);
                this.lsr(addr);
                cycles = 7;
                break;
            }

            // No Operation (NOP) instruction
            case OPCODES.NOP: {
                cycles = 2;
                break;
            }

            // Logical Inclusive OR (ORA) instructions
            case OPCODES.ORA_Immediate: {
                this.ora(this.immediate());
                cycles = 2;
                break;
            }
            case OPCODES.ORA_Zero_Page: {
                const addr = this.zeroPage();
                this.ora(addr);
                cycles = 3;
                break;
            }
            case OPCODES.ORA_Zero_Page_X: {
                const addr = this.zeroPageIndexed(this.#X[0]);
                this.ora(addr);
                cycles = 4;
                break;
            }
            case OPCODES.ORA_Absolute: {
                const addr = this.absolute();
                this.ora(addr);
                cycles = 4;
                break;
            }
            case OPCODES.ORA_Absolute_X: {
                const tuple = this.absoluteXY(this.#X[0]);
                this.ora(tuple.addr);
                cycles = 4 + tuple.pageCrossed;
                break;
            }
            case OPCODES.ORA_Absolute_Y: {
                const tuple = this.absoluteXY(this.#Y[0]);
                this.ora(tuple.addr);
                cycles = 4 + tuple.pageCrossed;
                break;
            }
            case OPCODES.ORA_Indirect_X: {
                const tuple = this.indirectX();
                this.ora(tuple.addr);
                cycles = 6;
                break;
            }
            case OPCODES.ORA_Indirect_Y: {
                const tuple = this.indirectY();
                this.ora(tuple.addr);
                cycles = 5 + tuple.pageCrossed;
                break;
            }

            // Push/Pull commands
            case OPCODES.PHA: {
                this.push(this.#A[0]);
                cycles = 3;
                break;
            }
            case OPCODES.PHP: {
                this.push(this.#P[0]);
                cycles = 3;
                break;
            }
            case OPCODES.PLA: {
                this.#A[0] = this.pop();
                this.setFlag(FLAGS.N, (this.#A[0] & 0x80) >> 7);
                this.setFlag(FLAGS.Z, (this.#A[0] === 0) ? 1 : 0);
                cycles = 4;
                break;
            }
            case OPCODES.PLP: {
                this.#P[0] = this.pop();
                cycles = 4;
                break;
            }

            // Rotate Left (ROL) instructions
            case OPCODES.ROL_Accumulator: {
                this.rol("A");
                cycles = 2;
                break;
            }
            case OPCODES.ROL_Zero_Page: {
                const addr = this.zeroPage();
                this.rol(addr);
                cycles = 5;
                break;
            }
            case OPCODES.ROL_Zero_Page_X: {
                const addr = this.zeroPageIndexed(this.#X[0]);
                this.rol(addr);
                cycles = 6;
                break;
            }
            case OPCODES.ROL_Absolute: {
                const addr = this.absolute();
                this.rol(addr);
                cycles = 6;
                break;
            }
            case OPCODES.ROL_Absolute_X: {
                const addr = this.absoluteXY(this.#X[0]);
                this.rol(addr);
                cycles = 7;
                break;
            }

            // Rotate Right (ROR) instructions
            case OPCODES.ROR_Accumulator: {
                this.ror("A");
                cycles = 2;
                break;
            }
            case OPCODES.ROR_Zero_Page: {
                const addr = this.zeroPage();
                this.ror(addr);
                cycles = 5;
                break;
            }
            case OPCODES.ROR_Zero_Page_X: {
                const addr = this.zeroPageIndexed(this.#X[0]);
                this.ror(addr);
                cycles = 6;
                break;
            }
            case OPCODES.ROR_Absolute: {
                const addr = this.absolute();
                this.ror(addr);
                cycles = 6;
                break;
            }
            case OPCODES.ROR_Absolute_X: {
                const addr = this.absoluteXY(this.#X[0]);
                this.ror(addr);
                cycles = 7;
                break;
            }

            // Return from Interrupt (RTI) and Return from Subroutine (RTS) instructions
            case OPCODES.RTI: {
                this.#P[0] = this.pop();
                const lowByte = this.pop();
                const highByte = this.pop();
                this.#PC[0] = lowByte | (highByte << 8);
                cycles = 6;
                break;
            }
            case OPCODES.RTS: {
                const lowByte = this.pop();
                const highByte = this.pop();
                this.#PC[0] = (lowByte | (highByte << 8)) + 1;
                cycles = 6;
                break;
            }

            // Subtract with Carry (SBC) instructions
            case OPCODES.SBC_Immediate: {
                this.sbc(this.immediate());
                cycles = 2;
                break;
            }
            case OPCODES.SBC_Zero_Page: {
                const addr = this.zeroPage();
                this.sbc(addr);
                cycles = 3;
                break;
            }
            case OPCODES.SBC_Zero_Page_X: {
                const addr = this.zeroPageIndexed(this.#X[0]);
                this.sbc(addr);
                cycles = 4;
                break;
            }
            case OPCODES.SBC_Absolute: {
                const addr = this.absolute();
                this.sbc(addr);
                cycles = 4;
                break;
            }
            case OPCODES.SBC_Absolute_X: {
                const addr = this.absoluteXY(this.#X[0]);
                this.sbc(addr);
                cycles = 4;
                break;
            }
            case OPCODES.SBC_Absolute_Y: {
                const addr = this.absoluteXY(this.#Y[0]);
                this.sbc(addr);
                cycles = 4;
                break;
            }
            case OPCODES.SBC_Indirect_X: {
                const addr = this.indirectX();
                this.sbc(addr);
                cycles = 5;
                break;
            }
            case OPCODES.SBC_Indirect_Y: {
                const addr = this.indirectY();
                this.sbc(addr);
                cycles = 5;
                break;
            }

            // Set Flags instructions
            case OPCODES.SEC: {
                this.setFlag(FLAGS.C, 1);
                cycles = 2;
                break;
            }
            case OPCODES.SED: {
                this.setFlag(FLAGS.D, 1);
                cycles = 2;
                break;
            }
            case OPCODES.SEI: {
                this.setFlag(FLAGS.I, 1);
                cycles = 2;
                break;
            }

            // Store Registers (STA, STX, STY) instructions
            case OPCODES.STA_Zero_Page: {
                const addr = this.zeroPage();
                this.stAXY(addr, "A");
                cycles = 3;
                break;
            }
            case OPCODES.STA_Zero_Page_X: {
                const addr = this.zeroPageIndexed(this.#X[0]);
                this.stAXY(addr, "A");
                cycles = 4;
                break;
            }
            case OPCODES.STA_Absolute: {
                const addr = this.absolute();
                this.stAXY(addr, "A");
                cycles = 4;
                break;
            }
            case OPCODES.STA_Absolute_X: {
                const addr = this.absoluteXY(this.#X[0]);
                this.stAXY(addr, "A");
                cycles = 5;
                break;
            }
            case OPCODES.STA_Absolute_Y: {
                const addr = this.absoluteXY(this.#Y[0]);
                this.stAXY(addr, "A");
                cycles = 5;
                break;
            }
            case OPCODES.STA_Indirect_X: {
                const addr = this.indirectX();
                this.stAXY(addr, "A");
                cycles = 6;
                break;
            }
            case OPCODES.STA_Indirect_Y: {
                const addr = this.indirectY();
                this.stAXY(addr, "A");
                cycles = 6;
                break;
            }
            case OPCODES.STX_Zero_Page: {
                const addr = this.zeroPage();
                this.stAXY(addr, "X");
                cycles = 3;
                break;
            }
            case OPCODES.STX_Zero_Page_Y: {
                const addr = this.zeroPageIndexed(this.#Y[0]);
                this.stAXY(addr, "X");
                cycles = 4;
                break;
            }
            case OPCODES.STX_Absolute: {
                const addr = this.absolute();
                this.stAXY(addr, "X");
                cycles = 4;
                break;
            }
            case OPCODES.STY_Zero_Page: {
                const addr = this.zeroPage();
                this.stAXY(addr, "Y");
                cycles = 3;
                break;
            }
            case OPCODES.STY_Zero_Page_X: {
                const addr = this.zeroPageIndexed(this.#X[0]);
                this.stAXY(addr, "Y");
                cycles = 4;
                break;
            }
            case OPCODES.STY_Absolute: {
                const addr = this.absolute();
                this.stAXY(addr, "Y");
                cycles = 4;
                break;
            }

            // Transfer Registers (TAX, TAY, TSX, TXA, TXS, TYA) instructions
            case OPCODES.TAX: {
                this.transReg("A", "X");
                cycles = 2;
                break;
            }
            case OPCODES.TAY: {
                this.transReg("A", "Y");
                cycles = 2;
                break;
            }
            case OPCODES.TSX: {
                this.transReg("SP", "X");
                cycles = 2;
                break;
            }
            case OPCODES.TXA: {
                this.transReg("X", "A");
                cycles = 2;
                break;
            }
            case OPCODES.TXS: {
                this.transReg("X", "SP");
                cycles = 2;
                break;
            }
            case OPCODES.TYA: {
                this.transReg("Y", "A");
                cycles = 2;
                break;
            }

            // Halt (DEBUG_HALT) instruction - not an official 6502 instruction, but we can use it to signify the end of a program in our emulator
            // case OPCODES.DEBUG_HALT: {
            //     console.log("End of program reached.");
            //     this.#halted = true;  // Set halted flag to true so that if getInstruction is called again, it will just execute the end instruction again and log that the end of the program has been reached, instead of trying to execute whatever random data is after the end instruction in memory
            //     break;
            // }
            default: {
                console.warn(`Instruction ${instructionCode} not implemented yet or invalid instruction.  Perhaps Program Counter is misaligned?`);
                cycles = 0;
            }
        }
        return cycles;
    }

}

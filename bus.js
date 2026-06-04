import { Memory } from "./memory.js";
import { CPU } from "./cpu.js";
import { PPU } from "./ppu.js";
import { APU } from "./apu.js";

export class Bus {
    constructor(masterCycles = 0) {
        this.memory = new Memory();
        this.masterCycles = masterCycles;
        this.cpu = new CPU(this, {debugMode: true});  // Initialize CPU instance and pass the bus for communication
        this.ppu = new PPU(this);  // Initialize PPU instance and pass the bus for communication
        this.apu = new APU(this);  // Initialize APU instance and pass the bus for communication
    }

    read(address) {
        if (address >= 0x2000 && address <= 0x3FFF) {
            return this.ppu.read(address);
        }
        return this.memory.read(address);
    }

    write(address, value) {
        if (address >= 0x2000 && address <= 0x3FFF) {
            this.ppu.write(address, value);
        } else {
            this.memory.write(address, value);
        }
    }

    incrementCycles(cycles) {
        this.masterCycles += cycles;
    }

    readCycles() {
        return this.masterCycles;
    }
}
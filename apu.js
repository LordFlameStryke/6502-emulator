const REGISTERS = Object.freeze({
    PULSE: 0x4000,
    TRIANGLE: 0x4008,
    NOISE: 0x400C,
    DMC_FLAGS: 0x4010,
    DMC_DIRECT_LOAD: 0x4011,
    DMC_SAMPLE_ADDR: 0x4012,
    DMC_SAMPLE_LEN: 0x4013,
    STATUS: 0x4015,
    FRAME_COUNTER: 0x4017
});

export class APU {
    constructor(bus) {
        this.bus = bus;
        this.powerOn();
    }

    powerOn() {
        for (let i = 0; i < 8; i++) {
            this.bus.memory[REGISTERS.PULSE + i] = 0;
        }
        for (let i = 0; i < 4; i++) {
            this.bus.memory[REGISTERS.TRIANGLE + i] = 0;
            this.bus.memory[REGISTERS.NOISE + i] = 0;
        }
        this.bus.memory[REGISTERS.DMC_FLAGS] = 0;
        this.bus.memory[REGISTERS.DMC_DIRECT_LOAD] = 0;
        this.bus.memory[REGISTERS.DMC_SAMPLE_ADDR] = 0;
        this.bus.memory[REGISTERS.DMC_SAMPLE_LEN] = 0;
        this.bus.memory[REGISTERS.STATUS] = 0;
        this.bus.memory[REGISTERS.FRAME_COUNTER] = 0;
    }

    reset() {
        this.bus.memory[REGISTERS.DMC_DIRECT_LOAD] &= 1;
        this.bus.memory[REGISTERS.STATUS] = 0;
    }

}
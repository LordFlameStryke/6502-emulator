const ADDRESSES = Object.freeze({
    PPUCTRL: 0x2000,
    PPUMASK: 0x2001,
    PPUSTATUS: 0x2002,
    OAMADDR: 0x2003,
    OAMDATA: 0x2004,
    PPUSCROLL: 0x2005,
    PPUADDR: 0x2006,
    PPUDATA: 0x2007,
    OAMDMA: 0x4014
});

const PPUCTRL_FLAGS = Object.freeze({
    NAMETABLE_X: 0b00000001,  // Base nametable address (0 = $2000, 1 = $2400)
    NAMETABLE_Y: 0b00000010,  // Base nametable address (0 = $2000, 1 = $2800)
    VRAM_ADDR_INCREMENT: 0b00000100,  // VRAM address increment per CPU read/write of PPUDATA (0: add 1, 1: add 32)
    SPRITE_PATTERN_ADDR: 0b00001000,  // Sprite pattern table address for 8x8 sprites (0: $0000, 1: $1000)
    BACKGROUND_PATTERN_ADDR: 0b00010000,  // Background pattern table address (0: $0000, 1: $1000)
    SPRITE_SIZE: 0b00100000,  // Sprite size (0: 8x8 pixels, 1: 8x16 pixels)
    MASTER_SLAVE_SELECT: 0b01000000,  // PPU master/slave select (unused in NES)
    GENERATE_NMI: 0b10000000  // Generate an NMI at the start of the vertical blanking interval (0: off, 1: on)
});

const PPUMASK_FLAGS = Object.freeze({
    GRAYSCALE: 0b00000001,  // Grayscale mode (0: normal color, 1: produce a monochrome display)
    SHOW_BACKGROUND_LEFTMOST: 0b00000010,  // Show background in leftmost 8 pixels of screen (0: hide, 1: show)
    SHOW_SPRITES_LEFTMOST: 0b00000100,  // Show sprites in leftmost 8 pixels of screen (0: hide, 1: show)
    ENABLE_BACKGROUND: 0b00001000,  // Show background (0: hide, 1: show)
    ENABLE_SPRITES: 0b00010000,  // Show sprites (0: hide, 1: show)
    EMPHASIZE_RED: 0b00100000,  // Emphasize red (0: normal color, 1: emphasize red)
    EMPHASIZE_GREEN: 0b01000000,  // Emphasize green (0: normal color, 1: emphasize green)
    EMPHASIZE_BLUE: 0b10000000  // Emphasize blue (0: normal color, 1: emphasize blue)
});

const PPUSTATUS_FLAGS = Object.freeze({
    SPRITE_OVERFLOW: 0b00100000,  // Sprite overflow (set when more than 8 sprites appear on a scanline, cleared at the end of the vertical blanking interval)
    SPRITE_ZERO_HIT: 0b01000000,  // Sprite 0 Hit (set when a non-transparent pixel of sprite 0 overlaps a non-transparent background pixel, cleared at the end of the vertical blanking interval)
    VERTICAL_BLANK: 0b10000000  // Vertical blank has started (set at the start of the vertical blanking interval, cleared when PPUSTATUS is read)
});

export class PPU {
    #PPUCTRL = new Uint8Array(1);
    #PPUMASK = new Uint8Array(1);
    #PPUSTATUS = new Uint8Array(1);
    #OAMADDR = new Uint8Array(1);
    #OAMDATA = new Uint8Array(1);
    #PPUSCROLL = new Uint8Array(1);
    #PPUADDR = new Uint8Array(1);
    #PPUDATA = new Uint8Array(1);
    #OAMDMA = new Uint8Array(1);
    #PALLETTE = new Uint8Array(32);
    #OAM = new Uint8Array(256);  // Object Attribute Memory (OAM) for sprite data, 64 sprites * 4 bytes each = 256 bytes

    constructor(bus) {
        this.bus = bus;
        this.powerOn();
    }

    powerOn() {
        this.#PPUCTRL[0] = 0;
        this.#PPUMASK[0] = 0;
        this.#PPUSTATUS[0] &= 0b10100000;  // Clear VERTICAL_BLANK flag
        this.#OAMADDR[0] = 0;
        this.#PPUSCROLL[0] = 0;
        this.#PPUADDR[0] = 0;
        this.#PPUDATA[0] = 0;
    }

    reset() {
        this.#PPUCTRL[0] = 0;
        this.#PPUMASK[0] = 0;
        this.#PPUSTATUS[0] &= 0b11100000;
        this.#PPUSCROLL[0] = 0;
        this.#PPUDATA[0] = 0;
    }

    read(address) {
        switch (address) {
            case ADDRESSES.PPUCTRL:
                //return this.#PPUCTRL[0];
                throw new Error(`PPUCTRL is write-only and cannot be read from. Attempted read at address ${this.bus.memory.hex(address)}`);
                return 0;
            case ADDRESSES.PPUMASK:
                //return this.#PPUMASK[0];
                throw new Error(`PPUMASK is write-only and cannot be read from. Attempted read at address ${this.bus.memory.hex(address)}`);
                return 0;
            case ADDRESSES.PPUSTATUS:
                //return this.#PPUSTATUS[0];
                throw new Error(`PPUSTATUS is read-only and cannot be written to. Attempted write at address ${this.bus.memory.hex(address)}`);
                return 0;
            case ADDRESSES.OAMADDR:
                return this.#OAMADDR[0];
            case ADDRESSES.OAMDATA:
                return this.#OAMDATA[0];
            case ADDRESSES.PPUSCROLL:
                return this.#PPUSCROLL[0];
            case ADDRESSES.PPUADDR:
                return this.#PPUADDR[0];
            case ADDRESSES.PPUDATA:
                return this.#PPUDATA[0];
            case ADDRESSES.OAMDMA:
                //return this.#OAMDMA[0];
                throw new Error(`OAMDMA is write-only and cannot be read from. Attempted read at address ${this.bus.memory.hex(address)}`);
                return 0;
            default:
                console.warn(`Invalid PPU register read at address ${this.bus.memory.hex(address)}`);
                return 0;
        }
    }

    write(address, value) {
        switch (address) {
            case ADDRESSES.PPUCTRL:
                this.#PPUCTRL[0] = value;
                break;
            case ADDRESSES.PPUMASK:
                this.#PPUMASK[0] = value;
                break;
            case ADDRESSES.PPUSTATUS:
                //this.#PPUSTATUS[0] = value;
                throw new Error(`PPUSTATUS is read-only and cannot be written to. Attempted write with value ${this.bus.memory.hex(value)}`);
                break;
            case ADDRESSES.OAMADDR:
                this.#OAMADDR[0] = value;
                break;
            case ADDRESSES.OAMDATA:
                this.#OAMDATA[0] = value;
                break;
            case ADDRESSES.PPUSCROLL:
                this.#PPUSCROLL[0] = value;
                break;
            case ADDRESSES.PPUADDR:
                this.#PPUADDR[0] = value;
                break;
            case ADDRESSES.PPUDATA:
                this.#PPUDATA[0] = value;
                break;
            case ADDRESSES.OAMDMA:
                this.#OAMDMA[0] = value;
                break;
            default:
                console.warn(`Invalid PPU register write at address ${this.bus.memory.hex(address)} with value ${this.bus.memory.hex(value)}`);
                break;
        }
    }

    oamRead(address) {
        if (address < 0 || address > 255) {
            throw new Error(`OAM read error: Address ${this.bus.memory.hex(address)} is out of bounds`);
        }
        if (address % 4 !== 0) {
            throw new Error(`OAM read error: Address ${this.bus.memory.hex(address)} is not aligned to sprite data (must be a multiple of 4)`);
        }
        const sprite = [];
        for (let i = 0; i < 4; i++) {
            sprite.push(this.#OAM[address + i]);
        }
        return sprite;
    }

    oamWrite(address, values) {
        if (address < 0 || address > 255) {
            throw new Error(`OAM write error: Address ${this.bus.memory.hex(address)} is out of bounds`);
        }
        if (address % 4 !== 0) {
            throw new Error(`OAM write error: Address ${this.bus.memory.hex(address)} is not aligned to sprite data (must be a multiple of 4)`);
        }
        for (let i = 0; i < 4; i++) {
            this.#OAM[address + i] = values[i];
        }
    }
}
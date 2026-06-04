export class Memory {
    constructor() {
        this.address = new Uint8Array(0x10000);
    }

    hex(value, digits = 4, prefix = true) {
        return prefix ? "0x" : "" + value.toString(16).toUpperCase().padStart(digits, '0');
    }

    read(address) {
        if (address < 0 || address > 0xFFFF) {
            throw new Error(`Memory read error: Address ${this.hex(address)} is out of bounds`);
        }
        return this.address[address];
    }

    write(address, value) {
        if (address < 0 || address > 0xFFFF) {
            throw new Error(`Memory write error: Address ${this.hex(address)} is out of bounds`);
        }
        this.address[address] = value;
    }
}
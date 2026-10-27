const SCALE = 8;
const FACTOR = 100_000_000n;
const DECIMAL_PATTERN = /^(-?)(\d+)(?:\.(\d{1,8}))?$/;

export class FixedDecimal {
  private constructor(private readonly units: bigint) {}

  static parse(value: string): FixedDecimal {
    const match = DECIMAL_PATTERN.exec(value);
    if (!match) throw new Error("INVALID_DECIMAL");
    const sign = match[1] === "-" ? -1n : 1n;
    const whole = BigInt(match[2] ?? "0");
    const fraction = BigInt((match[3] ?? "").padEnd(SCALE, "0"));
    return new FixedDecimal(sign * (whole * FACTOR + fraction));
  }

  static zero(): FixedDecimal {
    return new FixedDecimal(0n);
  }
  add(other: FixedDecimal): FixedDecimal {
    return new FixedDecimal(this.units + other.units);
  }
  subtract(other: FixedDecimal): FixedDecimal {
    return new FixedDecimal(this.units - other.units);
  }
  multiply(other: FixedDecimal): FixedDecimal {
    const product = this.units * other.units;
    if (product % FACTOR !== 0n) throw new Error("DECIMAL_PRECISION_EXCEEDED");
    return new FixedDecimal(product / FACTOR);
  }
  compare(other: FixedDecimal): number {
    return this.units < other.units ? -1 : this.units > other.units ? 1 : 0;
  }
  divide(other: FixedDecimal): FixedDecimal {
    if (other.units === 0n) throw new Error("DIVISION_BY_ZERO");
    return new FixedDecimal((this.units * FACTOR) / other.units);
  }
  isZero(): boolean {
    return this.units === 0n;
  }
  negate(): FixedDecimal {
    return new FixedDecimal(-this.units);
  }
  isNegative(): boolean {
    return this.units < 0n;
  }
  isPositive(): boolean {
    return this.units > 0n;
  }
  equals(other: FixedDecimal): boolean {
    return this.units === other.units;
  }
  toString(): string {
    const negative = this.units < 0n;
    const absolute = negative ? -this.units : this.units;
    const whole = absolute / FACTOR;
    const fraction = (absolute % FACTOR).toString().padStart(SCALE, "0").replace(/0+$/, "");
    return `${negative ? "-" : ""}${whole.toString()}${fraction ? `.${fraction}` : ""}`;
  }
}

import { Data, Encodeable } from "@simonbackx/simple-encoding";
import { EncodeContext } from "@simonbackx/simple-encoding";

import { isSimpleError,SimpleError } from './SimpleError';

export function isSimpleErrors(e: any): e is SimpleErrors {
    return e.errors && Array.isArray(e.errors) && e.errors.length > 0 && isSimpleError(e.errors[0])
}

// Error that is caused by a client and should be reported to the client
export class SimpleErrors extends Error implements Encodeable {
    errors: SimpleError[];

    constructor(...errors: SimpleError[]) {
        super(errors.map((e) => e.toString()).join("\n"));
        this.errors = errors;
    }

    addError(error: SimpleError | SimpleErrors) {
        if (isSimpleError(error)) {
            this.errors.push(error);
            this.message += "\n" + error.toString();
        } else if (isSimpleErrors(error)) {
            this.errors.push(...error.errors);
            this.message += "\n" + error.toString();
        } else {
            throw new Error("Unsupported addError");
        }
    }

    unshiftError(error: SimpleError | SimpleErrors) {
        if (isSimpleError(error)) {
            this.errors.unshift(error);
            this.message += "\n" + error.toString();
        } else if (isSimpleErrors(error)) {
            this.errors.unshift(...error.errors);
            this.message += "\n" + error.toString();
        } else {
            throw new Error("Unsupported addError");
        }
    }

    get statusCode(): number | undefined {
        return this.errors.find((e) => e.statusCode !== undefined)?.statusCode;
    }

    removeErrorAt(index: number) {
        this.errors.splice(index, 1);
    }

    addNamespace(field: string) {
        this.errors.forEach((e) => {
            e.addNamespace(field);
        });
    }

    containsCode(code: string): boolean {
        return this.errors.findIndex((e) => e.code && e.code === code) !== -1;
    }

    containsFieldThatStartsWith(prefix: string): boolean {
        return this.errors.findIndex((e) => e.field && e.field.startsWith(prefix)) !== -1;
    }

    /**
     * Required to override the default toJSON behaviour of Error
     */
    toJSON() {
        return this.encode({ version: 0 });
    }

    encode(context: EncodeContext) {
        return {
            errors: this.errors.map((e) => e.encode(context)),
        };
    }

    static decode(data: Data): SimpleErrors {
        return new SimpleErrors(...data.field("errors").array(SimpleError));
    }

    throwIfNotEmpty() {
        if (this.errors.length > 0) {
            if (this.errors.length == 1) {
                throw this.errors[0];
            }
            throw this;
        }
    }

    /// Returns a human description of all the errors
    getHuman(): string {
        return this.errors
            .filter((e) => !!e.human)
            .map((e) => e.human)
            .join("\n");
    }
}
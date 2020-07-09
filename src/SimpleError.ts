import { Data, Encodeable } from "@simonbackx/simple-encoding";
import { EncodeContext } from "@simonbackx/simple-encoding";
import { v4 as uuidv4 } from "uuid";

// Error that is caused by a client and should be reported to the client
export class SimpleError extends Error implements Encodeable {
    id: string;
    code: string;
    message: string;
    human: string | undefined;
    field: string | undefined;

    /**
    * Used to determine the associated HTTP status code when thrown in an endpoint
    */
    statusCode?: number;

    constructor(error: { code: string; message: string; human?: string; field?: string; statusCode?: number; id?: string }) {
        super(error.message);
        this.code = error.code;
        this.message = error.message;
        this.human = error.human;
        this.field = error.field;
        this.statusCode = error.statusCode;
        this.id = error.id ?? this.generateID();

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, SimpleError);
        }
    }

    toString(): string {
        return this.code + ": " + this.message + (this.field ? " at " + this.field : "") + " (" + this.id + ")";
    }

    /**
     * Required to override the default toJSON behaviour of Error
     */
    toJSON() {
        return this.encode({ version: 0 });
    }

    encode(context: EncodeContext) {
        return {
            id: this.id,
            code: this.code,
            message: this.message,
            human: this.human,
            field: this.field,
        };
    }

    static decode(data: Data): SimpleError {
        return new SimpleError({
            id: data.field("id").string,
            code: data.field("code").string,
            message: data.field("message").string,
            human: data.optionalField("human")?.string,
            field: data.optionalField("field")?.string,
        });
    }

    doesMatchFields(fields: string[]): boolean {
        for (const field of fields) {
            if (this.doesMatchField(field)) {
                return true;
            }
        }
        return false;
    }

    doesMatchField(field: string): boolean {
        if (!this.field) {
            return false;
        }

        return this.field.startsWith(field);
    }

    generateID(): string {
        return uuidv4() + "@" + new Date().getTime()
    }

    addNamespace(field: string) {
        this.field = this.field ? field + "." + this.field : field;
    }

    /// Returns a human description of all the errors
    getHuman(): string {
        return this.human ?? this.message;
    }
}

export function isSimpleError(e: any): e is SimpleError {
    return e.id && e.code && e.message && e.encode && e.doesMatchFields && e.doesMatchField
}
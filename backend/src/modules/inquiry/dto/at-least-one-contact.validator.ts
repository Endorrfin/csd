import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Cross-field rule: at least one reachable contact channel must be provided —
 * email OR phone OR a messenger handle. Mirrors the frontend check.
 *
 * Attach to a REQUIRED property (e.g. `message`): putting it on an optional
 * field would let `@IsOptional` skip it exactly when that field is empty,
 * which is the case we need to catch.
 */
export function AtLeastOneContact(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'atLeastOneContact',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(_: unknown, args: ValidationArguments): boolean {
          const o = args.object as {
            email?: string;
            phone?: string;
            messengerHandle?: string;
          };
          return Boolean(o.email || o.phone || o.messengerHandle);
        },
        defaultMessage(): string {
          return 'At least one contact method is required (email, phone or messenger).';
        },
      },
    });
  };
}

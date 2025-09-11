// 1) Base primitives
type Primitive = string | number | boolean | symbol | bigint | null | undefined;

type BuiltinClasses =
	| Date
	| RegExp
	| Error
	| Map<any, any>
	| Set<any>
	| WeakMap<any, any>
	| WeakSet<any>
	| Promise<any>;

/** is a plain object (loosely) => record-like, not a class instance */
type IsPlainObject<T> =
	// arrays/functions excluded elsewhere; this tries to catch `{...}` shapes
	T extends object ? T extends any[] ? false
		: T extends Function ? false
		: T extends BuiltinClasses ? false
		: T extends Record<string, unknown> ? true
		: false
		: false;

/**
 * non-primitive, non-array, non-function,
 * non-builtin, non-plain-object" — i.e., *likely* user class instances
 */
type ClassDef<T> = T extends Primitive ? never
	: T extends Function ? never
	: T extends readonly unknown[] ? never
	: T extends BuiltinInstances ? never
	: IsPlainObject<T> extends true ? never
	: T extends object ? T
	: never;

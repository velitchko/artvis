export type Group = {
	name: string;
	artistsMemberOf: Array<any>; // Artist type to avoid circular dependency
};

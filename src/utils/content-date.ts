/** Accept YAML Date objects and calendar-valid CMS date strings, without coercing other primitives. */
export function normalizeContentDate(
	value: unknown,
	optional = false,
): unknown {
	if (optional && (value === "" || value === undefined)) return undefined;
	if (value instanceof Date) return value;
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
		return value;
	const parsed = new Date(`${value}T00:00:00.000Z`);
	if (
		!Number.isFinite(parsed.getTime()) ||
		parsed.toISOString().slice(0, 10) !== value
	)
		return value;
	return parsed;
}

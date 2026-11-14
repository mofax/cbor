import type { CBORIO } from "../sources/main.js";

interface Fixture {
	name: string;
	value: CBORIO;
	mapsAsObjects?: false;
}

export const fixtures: Fixture[] = [
	{ name: "small integer", value: 42 },
	{
		name: "numeric array",
		value: Array.from({ length: 128 }, (_, index) => [
			index,
			-index - 1,
			index * 100_000,
			index + 0.125,
		]).flat(),
	},
	{
		name: "ASCII text",
		value: "The sensor is online and reporting normally. ".repeat(64),
	},
	{
		name: "multilingual UTF-8 text",
		value: "Nairobi • Montréal • 東京 • قياسات • 🌡️\n".repeat(64),
	},
	{
		name: "nested telemetry",
		value: {
			device: { id: "sensor-281", location: "Nairobi", online: true },
			timestamp: new Date(1_700_000_000_125),
			readings: { temperature: 23.75, humidity: 0.618, pressure: 1011.24 },
			alerts: [{ code: "BATTERY_LOW", acknowledged: false }],
			labels: ["indoor", "lab"],
			maintenance: null,
		},
	},
	{
		name: "200 same-shape objects",
		value: Array.from({ length: 200 }, (_, id) => ({
			id,
			name: `sensor-${id}`,
			group: id % 4,
			active: id % 3 !== 0,
			reading: 20 + id / 256,
		})),
	},
	{
		name: "mixed-key map",
		value: new Map<CBORIO, CBORIO>([
			["1", "text key"],
			[1, "integer key"],
			[false, null],
			[2n ** 60n, "bigint key"],
		]),
		mapsAsObjects: false,
	},
	{
		name: "64 KiB byte string",
		value: Uint8Array.from({ length: 64 * 1024 }, (_, index) => index & 0xff),
	},
];

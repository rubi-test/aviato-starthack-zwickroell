type UUID = string;

export interface TestResult {
  /** Internal numeric result identifier */
  id: number;

  /** Human-readable name */
  name: string;

  /** Master test programs this result appears in */
  masterTestPrograms: readonly string[];

  /** Canonical UUID */
  uuid: UUID;

  /** Possible unit table IDs for this result */
  unitTableIds: readonly string[];
}

export const TESTRESULTS_DIC = [
  {
    id: 16386,
    name: "Gage length, fine strain",
    masterTestPrograms: ["xte051", "xcf052", "xpt053", "xct054", "xgs064"],
    uuid: "6302239B-9077-4542-9165-7E71900CCA5C",
    unitTableIds: ["Zwick.Unittable.Displacement"],
  },
  {
    id: 16386,
    name: "Maximum force",
    masterTestPrograms: ["xgp050", "xgp060", "xit055"],
    uuid: "9DB9C049-9B04-4bf1-BD29-A160E86DE691",
    unitTableIds: [
      "Zwick.Unittable.ForcePerDisplacement",
      "Zwick.Unittable.Force",
      "Zwick.Unittable.Stress",
      "Zwick.Unittable.ForcePerTiter",
    ],
  },

  {
    id: 16389,
    name: "Gage length, standard travel",
    masterTestPrograms: ["xte051", "xcf052", "xpt053", "xct054", "xgs064"],
    uuid: "F93CD020-5012-4356-8900-C01AB27DF51D",
    unitTableIds: ["Zwick.Unittable.Displacement"],
  },

  {
    id: 16389,
    name: "Cross-section",
    masterTestPrograms: [
      "xgp050",
      "xit055",
      "xht057",
      "xpd058",
      "xgp060",
      "xtr062",
      "xms063",
    ],
    uuid: "7A50B197-A819-479f-83DC-1EE7C94CB3F0",
    unitTableIds: ["Zwick.Unittable.Area"],
  },
  {
    id: 16392,
    name: "Result Crosssection",
    masterTestPrograms: ["xte051", "xcf052", "xpt053", "xct054", "xgs064"],
    uuid: "7A50B197-A819-479f-83DC-1EE7C94CB3F0",
    unitTableIds: ["Zwick.Unittable.Area"],
  },
  {
    id: 16395,
    name: "Result Force at break",
    masterTestPrograms: ["xte051", "xcf052", "xpt053", "xct054", "xgs064"],
    uuid: "BE8FDA8F-00EA-4e56-ABEF-E886103946B0",
    unitTableIds: [
      "Zwick.Unittable.Force",
      "Zwick.Unittable.Stress",
      "Zwick.Unittable.ForcePerDisplacement",
      "Zwick.Unittable.ForcePerTiter",
    ],
  },
  {
    id: 16398,
    name: "Gage length, crosshead",
    masterTestPrograms: ["xte051", "xcf052", "xpt053", "xct054", "xgs064"],
    uuid: "BFAD0033-C04F-4e1e-82B9-8CAD3CBECA8E",
    unitTableIds: ["Zwick.Unittable.Displacement"],
  },
  {
    id: 16401,
    name: "Maximum force",
    masterTestPrograms: ["xct054", "xgs064"],
    uuid: "9DB9C049-9B04-4bf1-BD29-A160E86DE691",
    unitTableIds: [
      "Zwick.Unittable.ForcePerDisplacement",
      "Zwick.Unittable.Force",
      "Zwick.Unittable.Stress",
      "Zwick.Unittable.ForcePerTiter",
    ],
  },
  {
    id: 16401,
    name: "Upper yield point without hysteresis",
    masterTestPrograms: ["xte051", "xcf052"],
    uuid: "1E616979-DB13-477a-91EA-F1C7BA96C9A7",
    unitTableIds: [
      "Zwick.Unittable.ForcePerTiter",
      "Zwick.Unittable.Force",
      "Zwick.Unittable.Stress",
      "Zwick.Unittable.ForcePerDisplacement",
    ],
  },
  {
    id: 16408,
    name: "Gage length",
    masterTestPrograms: ["xte051", "xcf052", "xpt053", "xct054", "xgs064"],
    uuid: "B594AFD8-B880-4bb6-BC68-D8DD6657B4F0",
    unitTableIds: ["Zwick.Unittable.Displacement"],
  },
  {
    id: 16410,
    name: "Upper yield point",
    masterTestPrograms: ["xte051", "xcf052"],
    uuid: "31D55559-E6A6-4fc3-B658-3C7291F3ECD4",
    unitTableIds: [
      "Zwick.Unittable.ForcePerDisplacement",
      "Zwick.Unittable.Stress",
      "Zwick.Unittable.ForcePerTiter",
      "Zwick.Unittable.Force",
    ],
  },
  {
    id: 16410,
    name: "Maximum force",
    masterTestPrograms: ["xpt053"],
    uuid: "9DB9C049-9B04-4bf1-BD29-A160E86DE691",
    unitTableIds: [
      "Zwick.Unittable.ForcePerDisplacement",
      "Zwick.Unittable.Force",
      "Zwick.Unittable.Stress",
      "Zwick.Unittable.ForcePerTiter",
    ],
  },
  {
    id: 16417,
    name: "Maximum force",
    masterTestPrograms: ["xte051", "xcf052"],
    uuid: "9DB9C049-9B04-4bf1-BD29-A160E86DE691",
    unitTableIds: [
      "Zwick.Unittable.ForcePerDisplacement",
      "Zwick.Unittable.Force",
      "Zwick.Unittable.Stress",
      "Zwick.Unittable.ForcePerTiter",
    ],
  },
  {
    id: 16417,
    name: "Deflection at Fmax",
    masterTestPrograms: ["xit055"],
    uuid: "B25EA6BD-9383-4ca5-893B-5AB41101491B",
    unitTableIds: ["Zwick.Unittable.Displacement", "Zwick.Unittable.Ratio"],
  },
  {
    id: 16426,
    name: "Strain at maximum force",
    masterTestPrograms: ["xte051", "xcf052", "xpt053", "xct054", "xgs064"],
    uuid: "B25EA6BD-9383-4ca5-893B-5AB41101491B",
    unitTableIds: ["Zwick.Unittable.Displacement", "Zwick.Unittable.Ratio"],
  },
  {
    id: 16429,
    name: "Nominal strain at maximum force",
    masterTestPrograms: ["xte051", "xcf052", "xpt053"],
    uuid: "ED440D77-DA8F-497e-B561-C9DEDDDA0153",
    unitTableIds: ["Zwick.Unittable.Ratio", "Zwick.Unittable.Displacement"],
  },
  {
    id: 16429,
    name: "Deflection at break",
    masterTestPrograms: ["xit055"],
    uuid: "D59FE381-F59E-41c2-9B8A-8D7238A9D575",
    unitTableIds: ["Zwick.Unittable.Ratio", "Zwick.Unittable.Displacement"],
  },
  {
    id: 16459,
    name: "Strain at break",
    masterTestPrograms: ["xte051", "xcf052", "xpt053", "xct054", "xgs064"],
    uuid: "D59FE381-F59E-41c2-9B8A-8D7238A9D575",
    unitTableIds: ["Zwick.Unittable.Ratio", "Zwick.Unittable.Displacement"],
  },
  {
    id: 16462,
    name: "Nominal strain at break",
    masterTestPrograms: ["xte051", "xcf052", "xpt053"],
    uuid: "1B061745-A1BD-4fc6-A2E6-BC672560E7BA",
    unitTableIds: ["Zwick.Unittable.Ratio", "Zwick.Unittable.Displacement"],
  },
  {
    id: 16471,
    name: "Young's modulus, begin",
    masterTestPrograms: ["xte051", "xcf052", "xpt053", "xct054", "xgs064"],
    uuid: "76B288E7-874D-499f-977D-40D7B49A6027",
    unitTableIds: [
      "Zwick.Unittable.ForcePerDisplacement",
      "Zwick.Unittable.ForcePerTiter",
      "Zwick.Unittable.Stress",
      "Zwick.Unittable.Force",
      "Zwick.Unittable.Ratio",
      "Zwick.Unittable.Displacement",
    ],
  },
  {
    id: 16474,
    name: "Young's modulus, end",
    masterTestPrograms: ["xte051", "xcf052", "xpt053", "xct054", "xgs064"],
    uuid: "53EDC9CC-5A5E-47d7-A0EE-B83E0B3DC425",
    unitTableIds: [
      "Zwick.Unittable.Force",
      "Zwick.Unittable.ForcePerTiter",
      "Zwick.Unittable.ForcePerDisplacement",
      "Zwick.Unittable.Stress",
      "Zwick.Unittable.Displacement",
      "Zwick.Unittable.Ratio",
    ],
  },
  {
    id: 16478,
    name: "Young's modulus",
    masterTestPrograms: ["xte051", "xcf052", "xpt053", "xct054", "xgs064"],
    uuid: "E8EBE231-9B7E-4ec3-990A-D5BFD9133E46",
    unitTableIds: [
      "Zwick.Unittable.Stress",
      "Zwick.Unittable.ForcePerTiter",
      "Zwick.Unittable.ForcePerDisplacement",
    ],
  },
  {
    id: 16498,
    name: "Work up to maximum force",
    masterTestPrograms: ["xte051", "xpt053", "xct054", "xgs064"],
    uuid: "11FB3FED-D46A-48fe-B8DF-ECD5D6D608C4",
    unitTableIds: ["Zwick.Unittable.Energy"],
  },
  {
    id: 16498,
    name: "Work up to break",
    masterTestPrograms: ["xcf052"],
    uuid: "110E8BB7-AF80-4dd9-8D2C-E8AFCCEF97A0",
    unitTableIds: ["Zwick.Unittable.Energy"],
  },
  {
    id: 16495,
    name: "Work up to maximum force",
    masterTestPrograms: ["xcf052"],
    uuid: "11FB3FED-D46A-48fe-B8DF-ECD5D6D608C4",
    unitTableIds: ["Zwick.Unittable.Energy"],
  },
  {
    id: 16498,
    name: "Work up to break",
    masterTestPrograms: ["xcf052"],
    uuid: "110E8BB7-AF80-4dd9-8D2C-E8AFCCEF97A0",
    unitTableIds: ["Zwick.Unittable.Energy"],
  },
  {
    id: 16495,
    name: "Work up to maximum force",
    masterTestPrograms: ["xcf052"],
    uuid: "11FB3FED-D46A-48fe-B8DF-ECD5D6D608C4",
    unitTableIds: ["Zwick.Unittable.Energy"],
  },
  {
    id: 16501,
    name: "Work up to break",
    masterTestPrograms: ["xte051", "xpt053", "xct054", "xgs064"],
    uuid: "110E8BB7-AF80-4dd9-8D2C-E8AFCCEF97A0",
    unitTableIds: ["Zwick.Unittable.Energy"],
  },
  {
    id: 16510,
    name: "Point of break",
    masterTestPrograms: ["xcf052"],
    uuid: "20BD4D85-F4DF-4d15-B92B-0AEF24E512E0",
    unitTableIds: ["Zwick.Unittable.Displacement"],
  },
  {
    id: 16513,
    name: "Point of break",
    masterTestPrograms: ["xte051", "xpt053", "xct054", "xgs064"],
    uuid: "20BD4D85-F4DF-4d15-B92B-0AEF24E512E0",
    unitTableIds: ["Zwick.Unittable.Displacement"],
  },
  {
    id: 16526,
    name: "Test duration",
    masterTestPrograms: ["xcf052"],
    uuid: "A8DF16CE-8E60-4d6f-B5A7-76F9D8149745",
    unitTableIds: ["Zwick.Unittable.Time"],
  },
  {
    id: 16529,
    name: "Test duration",
    masterTestPrograms: ["xte051", "xpt053", "xct054", "xgs064"],
    uuid: "A8DF16CE-8E60-4d6f-B5A7-76F9D8149745",
    unitTableIds: ["Zwick.Unittable.Time"],
  },
] as const satisfies readonly TestResult[];

export type TestResultName = (typeof TESTRESULTS_DIC)[number]["name"];
export type TestResultUUID = (typeof TESTRESULTS_DIC)[number]["uuid"];
export type TestResultId = (typeof TESTRESULTS_DIC)[number]["id"];
export type MasterTestProgram =
  (typeof TESTRESULTS_DIC)[number]["masterTestPrograms"][number];

export type TestByName<N extends TestResultName> = Extract<
  (typeof TESTRESULTS_DIC)[number],
  { name: N }
>;
export type TestResultUuidByName<N extends TestResultName> =
  TestByName<N>["uuid"];
export type TestResultUnitsByName<N extends TestResultName> =
  TestByName<N>["unitTableIds"][number];

export type UnitTableId =
  (typeof TESTRESULTS_DIC)[number]["unitTableIds"][number];

export const testByName = Object.fromEntries(
  TESTRESULTS_DIC.map((t) => [t.name, t]),
) as {
  [K in TestResultName]: TestByName<K>;
};

export function getTestResultByUUID(uuid: TestResultUUID) {
  return TESTRESULTS_DIC.find((r) => r.uuid === uuid);
}

export function getTestResultsForProgram(masterTestProgram: MasterTestProgram) {
  return TESTRESULTS_DIC.filter((r) =>
    //@ts-ignore
    r.masterTestPrograms.includes(masterTestProgram),
  );
}

export function getUnitTableIdsForResult(
  uuid: TestResultUUID,
): readonly string[] {
  const result = getTestResultByUUID(uuid);
  return result?.unitTableIds ?? [];
}

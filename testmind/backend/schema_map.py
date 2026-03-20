"""Schema mapping layer — bridges Zwick UUID identifiers to human-readable property names.

This module converts the UUID-based identifiers used by Zwick testing machines
into the property names our tool layer expects (e.g. max_force_n, tensile_modulus_mpa).

Sources:
    - UUID_helpers/testResultTypes.ts  → result type UUIDs
    - UUID_helpers/channelParameterMap.ts  → measurement channel UUIDs
    - UUID_helpers/TestParameterMap.json  → test parameter UUIDs
"""

import re


# ---------------------------------------------------------------------------
# Result type UUID → tool property name
# Derived from testResultTypes.ts TESTRESULTS_DIC
# ---------------------------------------------------------------------------

RESULT_UUID_TO_PROPERTY: dict[str, str] = {
    # Maximum force (appears in multiple master programs)
    "9DB9C049-9B04-4bf1-BD29-A160E86DE691": "max_force_n",
    # Young's modulus
    "E8EBE231-9B7E-4ec3-990A-D5BFD9133E46": "tensile_modulus_mpa",
    # Strain at break → elongation at break
    "D59FE381-F59E-41c2-9B8A-8D7238A9D575": "elongation_at_break_pct",
    # Nominal strain at break
    "1B061745-A1BD-4fc6-A2E6-BC672560E7BA": "nominal_strain_at_break_pct",
    # Force at break
    "BE8FDA8F-00EA-4e56-ABEF-E886103946B0": "force_at_break_n",
    # Upper yield point
    "31D55559-E6A6-4fc3-B658-3C7291F3ECD4": "upper_yield_point_mpa",
    # Upper yield point without hysteresis
    "1E616979-DB13-477a-91EA-F1C7BA96C9A7": "upper_yield_point_no_hysteresis_mpa",
    # Strain at maximum force
    "B25EA6BD-9383-4ca5-893B-5AB41101491B": "strain_at_max_force_pct",
    # Nominal strain at maximum force
    "ED440D77-DA8F-497e-B561-C9DEDDDA0153": "nominal_strain_at_max_force_pct",
    # Young's modulus begin
    "76B288E7-874D-499f-977D-40D7B49A6027": "youngs_modulus_begin",
    # Young's modulus end
    "53EDC9CC-5A5E-47d7-A0EE-B83E0B3DC425": "youngs_modulus_end",
    # Work up to maximum force
    "11FB3FED-D46A-48fe-B8DF-ECD5D6D608C4": "work_to_max_force_j",
    # Work up to break
    "110E8BB7-AF80-4dd9-8D2C-E8AFCCEF97A0": "work_to_break_j",
    # Test duration
    "A8DF16CE-8E60-4d6f-B5A7-76F9D8149745": "test_duration_s",
    # Point of break
    "20BD4D85-F4DF-4d15-B92B-0AEF24E512E0": "point_of_break",
    # Gage length, fine strain
    "6302239B-9077-4542-9165-7E71900CCA5C": "gage_length_fine_strain",
    # Gage length, standard travel
    "F93CD020-5012-4356-8900-C01AB27DF51D": "gage_length_standard_travel",
    # Cross-section / Result Crosssection
    "7A50B197-A819-479f-83DC-1EE7C94CB3F0": "cross_section_mm2",
    # Gage length, crosshead
    "BFAD0033-C04F-4e1e-82B9-8CAD3CBECA8E": "gage_length_crosshead",
    # Gage length
    "B594AFD8-B880-4bb6-BC68-D8DD6657B4F0": "gage_length",
    # Deflection at break (impact)
    # Note: same UUID as strain_at_max_force_pct but in impact context (xit055)
}

# Build a case-normalized lookup (uppercase keys)
_RESULT_UUID_UPPER: dict[str, str] = {k.upper(): v for k, v in RESULT_UUID_TO_PROPERTY.items()}

# Reverse mapping: property name → result type UUID
PROPERTY_TO_RESULT_UUID: dict[str, str] = {v: k for k, v in RESULT_UUID_TO_PROPERTY.items()}

# tensile_strength_mpa shares the same UUID as max_force_n but uses the Stress unit table
# (Zwick stores both force and stress variants under the same result UUID)
PROPERTY_TO_RESULT_UUID["tensile_strength_mpa"] = "9DB9C049-9B04-4bf1-BD29-A160E86DE691"

# Map result UUIDs to the unit table that indicates stress (MPa) results
# This helps disambiguate force vs stress when the same UUID appears with different units
STRESS_UNIT_TABLES = frozenset({
    "Zwick.Unittable.Stress",
    "Zwick.Unittable.ForcePerDisplacement",
    "Zwick.Unittable.ForcePerTiter",
})

FORCE_UNIT_TABLES = frozenset({
    "Zwick.Unittable.Force",
})

ENERGY_UNIT_TABLES = frozenset({
    "Zwick.Unittable.Energy",
})

DISPLACEMENT_UNIT_TABLES = frozenset({
    "Zwick.Unittable.Displacement",
})

RATIO_UNIT_TABLES = frozenset({
    "Zwick.Unittable.Ratio",
})

# ---------------------------------------------------------------------------
# Channel parameter UUID → name
# Derived from channelParameterMap.ts
# ---------------------------------------------------------------------------

CHANNEL_UUID_TO_NAME: dict[str, str] = {
    "{04A31CB5-DC19-42fa-8A0A-C3CACE1D0103}": "system_time_sensor",
    "{3BCEDF86-ED0A-45f9-B452-5D8C6F2978D1}": "crosshead_travel_sensor",
    "{740A4C83-985E-4dd3-B4C1-CBC709340933}": "standard_load_cell",
    "{289C9C84-5001-4440-AAE3-52772C3F8F49}": "standard_extensometer",
    "{C9F5D996-ACE9-4ccb-A26B-3B3B4403AB26}": "time",
    "{CBE74C00-54B9-433f-BA63-B7777AE34A81}": "nominal_strain",
    "{E5F23924-1A5D-40a6-B66D-62E708B1DF83}": "standard_force",
    "{2C840DA7-1278-47da-89DB-18B3CF44A7D3}": "standard_travel",
    "{A2CA0D5E-7880-492e-8775-61C8C5AC735B}": "fine_strain",
    "{B58A6F2B-0777-4d91-88B5-23E85A7994B6}": "grip_to_grip_separation",
    "{76FC2C7C-7BB1-407a-8E55-4CA18586F486}": "crosshead_absolute",
    "{8C9C92CF-E6C0-47ef-B8A4-092C4B057D40}": "temperature_2",
    "{E4C21909-B178-4fdc-8662-A13B4C7FF756}": "strain_deformation",
    "{F4640D35-9098-4f57-B5F7-D999DAC7D0DF}": "strain_plastic",
    "{0CC4A780-F198-449d-B262-31645567A06F}": "strain_x_corrected",
    "{110A8DC1-1552-452b-B022-04D131C21B47}": "temperature",
    "{11A91358-1286-44db-BDDE-8C0030839939}": "specimen_width",
    "{C2058AF2-5201-40ea-B7B9-8B02A1E5A6CD}": "work",
    "{26785D5A-A3C7-44a4-A8EC-4855701ACF6F}": "test_time",
    "{530A9CE5-2881-4180-8B3B-CA163B6999AA}": "transverse_strain",
    "{B09F954B-5D05-4b9d-A4AF-8E83EB9AF79D}": "absolute_standard_force",
    "{9551DCA9-D1BC-4fa5-97EB-5AD30A197825}": "absolute_standard_travel",
    "{56CAC45F-E554-464e-BEFD-7E40A993F7EA}": "total_test_time",
    "{FC9B5E41-1335-48f6-8CF3-545F119DC420}": "temperature_3",
    "{CCB19FA9-C7F5-449e-9B85-EE403D2E9C4F}": "set_value",
    "{33F0B5C2-DA2B-4b16-B827-764F43F1F4B1}": "actual_value",
    "{9CE0679A-EBE8-408e-9E51-C4C4282CA621}": "control_point",
    "{8ABE8F51-3FD7-4245-B024-9846797E512B}": "strain_increase_rate",
    "{00B4D204-3978-4dad-91AA-A53BC3A34719}": "force_increase_rate",
    "{DE8CFDDA-5FB8-48f1-A533-4C4FEE0AB8D0}": "crosshead_speed",
    "{F9384679-A0E7-460f-ACFA-E6DAE85EAC26}": "chamber_temperature",
    "{0F0D7386-BC55-4739-8879-0A82E2216D7B}": "specimen_temperature",
    "{14090599-908E-44dd-9984-6FC8D891DFB7}": "additional_temperature",
}

# ---------------------------------------------------------------------------
# Test parameter UUID → name (from TestParameterMap.json)
# ---------------------------------------------------------------------------

PARAM_UUID_TO_NAME: dict[str, str] = {
    "{DDC875FE-A178-4768-9ADD-E3CB0BBAAC6D}": "STANDARD",
    "{1E1B7093-4D46-4d87-8EE4-BB53534FD3AE}": "CUSTOMER",
    "{5F8F743A-26A3-4248-A17C-531F1A0023BE}": "MATERIAL",
    "{9E9AE153-48EC-433a-83CB-55E0D51A4F05}": "SPECIMEN_REMOVAL",
    "{84A68805-ABFD-4709-A761-96BD70D2F489}": "PRE_TREATMENT",
    "{89FD6BBA-387F-4a99-889E-65150BBFF880}": "TYPE_AND_DESTINATION",
    "{8FC1D803-5D84-4167-9468-B7F5FF1D3CC0}": "NOTES",
    "{BDA8401C-705B-4f22-A8D3-F4171CF2310F}": "TESTER",
    "{58DE2E80-65C5-4c42-9750-E09297712E62}": "MACHINE_DATA",
    "{213B5382-CAA3-4e50-9037-DFD4D3F5B042}": "JOB_NO",
    "{01CA8921-7571-44fd-8C18-320E674CA3EA}": "SPECIMEN_THICKNESS",
    "{A72916AE-4723-4d1d-B09B-DBF2F68F8C78}": "SPECIMEN_WIDTH",
    "{7FF474B8-34B1-4295-82B0-2D088F984FB0}": "SPECIMEN_TYPE",
    "{A377CCFA-6CD8-45b7-B90B-EC5F9E6DB4BE}": "TYPE_OF_TESTING",
    "Zwick.Parameter.Zpf.Terminology.TypeOfTesting": "TYPE_OF_TESTING_STR",
    "{357F1158-1FF9-4823-BB37-47A41DA1EF23}": "TYPE_OF_TEST",
    "{04DC05F9-4496-47da-B819-7A6AC7FA20D2}": "TEST_SPEED",
    "{79ACBC8B-6869-464d-9432-96B98C25C75A}": "MATERIAL_P",
    "{97BC3235-7FA0-4a78-BEB1-1C9A2416C364}": "FINDINGS",
    "{ED0EECCF-C220-4456-BFE8-0EAA369C6BA5}": "COMMENT",
    "{E4D97DE6-7009-45c4-9784-260FCC0B9D44}": "NOTE",
    "Zwick.Parameter.Zpf.Terminology.MachineType": "MACHINE_TYPE_STR",
    "{D5B16631-5279-48c9-8242-3E03B3003209}": "TYPE",
    "{7B9E9F5F-EC8C-4483-A068-1A229B05CCFC}": "Date",
    "{6D08BDA8-C611-4e62-9575-FD7088D43AC4}": "Clock_time",
    "{66C580CB-F7A6-4f67-8F59-4B271FC4ADB1}": "SPECIMEN_ID",
    "{463B336A-9F2F-4f86-8379-C4F756612CF5}": "PART_NO",
    "{38A98A1D-8ED6-4141-87A1-AB2C013E7664}": "APPLICATION_ENGINEER",
    "{6E99D1F5-AC66-49f4-8CD4-76F8CD03369E}": "CUSTOMER_NAME",
    "{C5BF38A0-0EDD-40eb-AB92-2AB30547BD9E}": "GRIPS",
    "{E8A33C8F-8F33-416c-A264-3F79626E1400}": "JAWS",
    "{C9DA573B-25AE-4e7c-A502-D2C1900A7707}": "GRIPS_SPECIFICATION",
    "{FD3AD540-505C-4475-9AC9-BCA56D5E02FB}": "LOAD_CELL",
    "{4AD02FFA-5E1E-4113-8EE3-1DB547C43856}": "SERIES_DESIGNATION",
}

# ---------------------------------------------------------------------------
# Common standards → test type mapping
# ---------------------------------------------------------------------------

STANDARD_TO_TEST_TYPE: dict[str, str] = {
    "DIN EN ISO 527": "tensile",
    "ISO 527": "tensile",
    "ASTM D638": "tensile",
    "DIN EN ISO 604": "compression",
    "ISO 604": "compression",
    "DIN EN ISO 179": "charpy",
    "ISO 179": "charpy",
    "DIN EN ISO 178": "flexure",
    "ISO 178": "flexure",
    "ASTM D790": "flexure",
    "DIN EN ISO 180": "izod",
    "ISO 180": "izod",
}

# ---------------------------------------------------------------------------
# Key properties that tools know about — the "canonical" list
# ---------------------------------------------------------------------------

TOOL_PROPERTIES: list[tuple[str, str]] = [
    ("tensile_strength_mpa", "MPa"),
    ("tensile_modulus_mpa", "MPa"),
    ("elongation_at_break_pct", "%"),
    ("impact_energy_j", "J"),
    ("max_force_n", "N"),
    ("force_at_break_n", "N"),
    ("upper_yield_point_mpa", "MPa"),
    ("strain_at_max_force_pct", "%"),
    ("nominal_strain_at_break_pct", "%"),
    ("work_to_max_force_j", "J"),
    ("work_to_break_j", "J"),
    ("cross_section_mm2", "mm²"),
    ("test_duration_s", "s"),
]

# Property name → unit (for quick lookup)
PROPERTY_UNITS: dict[str, str] = dict(TOOL_PROPERTIES)

# ---------------------------------------------------------------------------
# childId parsing helpers
# ---------------------------------------------------------------------------

# Real childId format from valuecolumns_migrated:
#   {UUID}-Zwick.Unittable.XXX.{UUID}-Zwick.Unittable.XXX_Value
# or simpler:
#   {UUID}_Value
_CHILD_ID_RE = re.compile(
    r"\{([0-9A-Fa-f-]+)\}[-_](?:Zwick\.Unittable\.(\w+))?",
)


def parse_child_id(child_id: str) -> dict:
    """Parse a childId string into its components.

    Real format from txp_clean.valuecolumns_migrated:
        "{9DB9C049-9B04-4bf1-BD29-A160E86DE691}-Zwick.Unittable.Force.{...}-Zwick.Unittable.Force_Value"

    Returns:
        {"result_uuid": "...", "unit_table": "..." or None, "is_value": bool}
    """
    if not child_id:
        return {"result_uuid": None, "unit_table": None, "is_value": False}

    is_value = child_id.endswith("_Value")

    match = _CHILD_ID_RE.search(child_id)
    if match:
        return {
            "result_uuid": match.group(1).upper(),
            "unit_table": f"Zwick.Unittable.{match.group(2)}" if match.group(2) else None,
            "is_value": is_value,
        }

    # Fallback: extract first UUID-like pattern
    uuid_match = re.search(r"\{([0-9A-Fa-f-]+)\}", child_id)
    if uuid_match:
        return {
            "result_uuid": uuid_match.group(1).upper(),
            "unit_table": None,
            "is_value": is_value,
        }

    return {"result_uuid": None, "unit_table": None, "is_value": False}


# ---------------------------------------------------------------------------
# Unit conversion — values are stored in base SI units
# ---------------------------------------------------------------------------

# Maps (result_property, preferred_unit_table) for the enrichment script.
# For each result, we pick the unit table that gives us the desired output unit.
PREFERRED_UNIT_TABLE: dict[str, str] = {
    "tensile_strength_mpa": "Zwick.Unittable.Stress",
    "max_force_n": "Zwick.Unittable.Force",
    "tensile_modulus_mpa": "Zwick.Unittable.Stress",
    "elongation_at_break_pct": "Zwick.Unittable.Ratio",
    "nominal_strain_at_break_pct": "Zwick.Unittable.Ratio",
    "force_at_break_n": "Zwick.Unittable.Force",
    "upper_yield_point_mpa": "Zwick.Unittable.Stress",
    "upper_yield_point_no_hysteresis_mpa": "Zwick.Unittable.Stress",
    "strain_at_max_force_pct": "Zwick.Unittable.Ratio",
    "nominal_strain_at_max_force_pct": "Zwick.Unittable.Ratio",
    "work_to_max_force_j": "Zwick.Unittable.Energy",
    "work_to_break_j": "Zwick.Unittable.Energy",
    "cross_section_mm2": "Zwick.Unittable.Area",
    "test_duration_s": "Zwick.Unittable.Time",
}

# Base SI → display unit conversion factors
# Zwick stores values in base SI: Pa for stress, m for displacement, etc.
UNIT_CONVERSIONS: dict[str, float] = {
    "tensile_strength_mpa": 1e-6,      # Pa → MPa
    "tensile_modulus_mpa": 1e-6,       # Pa → MPa
    "upper_yield_point_mpa": 1e-6,     # Pa → MPa
    "upper_yield_point_no_hysteresis_mpa": 1e-6,
    "elongation_at_break_pct": 100.0,  # fraction → %
    "nominal_strain_at_break_pct": 100.0,
    "strain_at_max_force_pct": 100.0,
    "nominal_strain_at_max_force_pct": 100.0,
    # Force, Energy, Time are already in N, J, s in base SI
}


def convert_to_display_unit(prop_name: str, raw_value: float) -> float:
    """Convert a raw value from base SI to the display unit for this property."""
    factor = UNIT_CONVERSIONS.get(prop_name, 1.0)
    return raw_value * factor


def get_result_property_name(child_id: str) -> str | None:
    """Given a childId, return the tool property name (e.g. 'max_force_n').

    Returns None if the UUID is not in our mapping.
    """
    parsed = parse_child_id(child_id)
    uuid = parsed["result_uuid"]
    if not uuid:
        return None

    # Normalize UUID format to uppercase without braces
    uuid_normalized = uuid.upper().strip("{}")
    return _RESULT_UUID_UPPER.get(uuid_normalized)


def resolve_property_path(prop_name: str) -> str:
    """Return the dotted MongoDB field path for a property name.

    Checks computed_results first (from enriched collection),
    then falls back to TestParametersFlat.
    """
    # Properties that come from the values collection (via enrichment)
    if prop_name in PROPERTY_TO_RESULT_UUID:
        return f"computed_results.{prop_name}"
    # Properties that live directly in TestParametersFlat
    return f"TestParametersFlat.{prop_name}"


def get_unit(prop_name: str) -> str:
    """Return the unit string for a property name."""
    if prop_name in PROPERTY_UNITS:
        return PROPERTY_UNITS[prop_name]
    if "mpa" in prop_name:
        return "MPa"
    if "_j" in prop_name:
        return "J"
    if "_n" in prop_name:
        return "N"
    if "pct" in prop_name:
        return "%"
    if "mm2" in prop_name:
        return "mm²"
    if "_s" in prop_name:
        return "s"
    return ""

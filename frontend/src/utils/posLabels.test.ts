import {
  getPosLabel,
  getPosDescription,
  getPosLabelWithClass,
  getPosDescriptionWithClass,
} from "./posLabels";

describe("POS label utilities", () => {
  it("returns the label for a known tag", () => {
    expect(getPosLabel("NN1")).toBe("Singular noun");
  });

  it("handles missing and unknown tags", () => {
    expect(getPosLabel(null)).toBe("Unknown POS");
    expect(getPosLabel("UNKNOWN")).toBe("Unmapped tag (UNKNOWN)");
  });

  it("includes the broad class when available", () => {
    expect(getPosLabelWithClass("NN1", "SUBST")).toBe(
      "Singular noun (Substantive/noun)",
    );
  });

  it("preserves unknown tags and their broad class", () => {
    expect(getPosLabelWithClass("NEW_TAG", "VERB")).toBe("Verb (NEW_TAG)");
  });

  it("provides descriptions for known, missing and unknown tags", () => {
    expect(getPosDescription("NN1")).toContain("Singular common noun");
    expect(getPosDescription(null)).toBe("No part-of-speech tag is available.");
    expect(getPosDescription("UNKNOWN")).toContain("no verified description");
  });

  it("appends the broad class to descriptions when available", () => {
    expect(getPosDescriptionWithClass("NN1", "SUBST")).toContain(
      "Broad corpus class: Substantive/noun.",
    );
  });
});

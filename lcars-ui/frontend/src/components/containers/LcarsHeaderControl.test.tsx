import { render } from "@testing-library/react";

import { LcarsHeaderControl } from "./LcarsHeaderControl";

describe("LcarsHeaderControl", () => {
  test("renders the heading through the shared capsule-bar primitive", () => {
    const { container } = render(
      <LcarsHeaderControl
        widget={{
          id: "header-ops",
          type: "lcars_header",
          text: "OPERATIONS",
          size: "h2",
          color: "orange",
        }}
      />,
    );

    const sharedHeader = container.querySelector(
      '.lcars-header-control-bar[data-lcars-shared-primitive="capsule-bar"]',
    );
    expect(sharedHeader).not.toBeNull();
    expect(sharedHeader?.querySelector(".lcars-bar-label")?.textContent).toBe("OPERATIONS");
  });
});

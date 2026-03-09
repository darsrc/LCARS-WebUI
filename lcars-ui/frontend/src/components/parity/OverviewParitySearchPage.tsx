import referenceSweepImage from "../../assets/README-sweep.png";
import type { Page } from "../../types/contract";

interface OverviewParitySearchPageProps {
  page: Page;
}

export const OverviewParitySearchPage = ({ page }: OverviewParitySearchPageProps) => {
  return (
    <div className="lcars-strict-page lcars-overview-search-page" data-lcars-page={page.id}>
      <section className="lcars-strict-band lcars-overview-search-band" data-lcars-band="overview-parity-search">
        <div className="lcars-strict-band-grid">
          <article
            className="lcars-strict-lane lcars-strict-lane-terminal-end lcars-overview-search-lane"
            data-lcars-lane="overview-parity-search"
          >
            <div className="lcars-strict-lane-header">
              <div className="lcars-strict-lane-header-bar" />
            </div>

            <div className="lcars-strict-lane-body">
              <div className="lcars-strict-lane-core">
                <div className="lcars-strict-lane-core-primary">
                  <div className="lcars-strict-lane-core-item">
                    <div className="lcars-overview-search-canvas">
                      <img
                        alt=""
                        aria-hidden="true"
                        className="lcars-overview-search-reference"
                        src={referenceSweepImage}
                      />
                    </div>
                  </div>

                  {Array.from({ length: 9 }, (_, index) => (
                    <div className="lcars-strict-lane-core-item lcars-overview-search-shadow-node" key={`shadow-${index}`} />
                  ))}
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
};

import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";

const HITTER_POSITIONS = [
  { abbr: "C",  label: "Catcher",            color: "var(--ctp-blue)"    },
  { abbr: "1B", label: "First Base",          color: "var(--ctp-peach)"   },
  { abbr: "2B", label: "Second Base",         color: "var(--ctp-yellow)"  },
  { abbr: "3B", label: "Third Base",          color: "var(--ctp-red)"     },
  { abbr: "SS", label: "Shortstop",           color: "var(--ctp-mauve)"   },
  { abbr: "LF", label: "Left Field",          color: "var(--ctp-green)"   },
  { abbr: "CF", label: "Center Field",        color: "var(--ctp-teal)"    },
  { abbr: "RF", label: "Right Field",         color: "var(--ctp-sapphire)"},
  { abbr: "DH", label: "Designated Hitter",   color: "var(--ctp-lavender)"},
];

const PITCHER_POSITIONS = [
  { abbr: "SP", label: "Starting Pitcher",    color: "var(--ctp-red)"     },
  { abbr: "RP", label: "Relief Pitcher",      color: "var(--ctp-peach)"   },
];

function PositionTile({ pos }) {
  return (
    <Link
      to={`/position/${pos.abbr}`}
      className="pos-tile"
      style={{ "--pos-color": pos.color }}
    >
      <span className="pos-tile-abbr">{pos.abbr}</span>
      <span className="pos-tile-label">{pos.label}</span>
    </Link>
  );
}

function PositionsPage() {
  return (
    <div className="app-screen">
      <PageHeader
        title="Browse by Position"
        subtitle="Explore MLB statistical leaders at every position"
        backTo="/"
        backLabel="Home"
      />

      <div className="screen-body px-6 py-6 w-full">
        <section className="pos-group">
          <h2 className="pos-group-title">Hitters</h2>
          <div className="pos-grid">
            {HITTER_POSITIONS.map((pos) => (
              <PositionTile key={pos.abbr} pos={pos} />
            ))}
          </div>
        </section>

        <section className="pos-group">
          <h2 className="pos-group-title">Pitchers</h2>
          <div className="pos-grid">
            {PITCHER_POSITIONS.map((pos) => (
              <PositionTile key={pos.abbr} pos={pos} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default PositionsPage;

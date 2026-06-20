import { ChevronDown } from "lucide-react";
import { useState } from "react";

export const fixtureFilters = ["Date", "Round", "My Team", "Group"] as const;
export type FixtureFilter = (typeof fixtureFilters)[number];

type FixtureFiltersProps = {
  activeFilter: FixtureFilter;
  onFilterChange: (filter: FixtureFilter) => void;
  onGroupChange: (group: string) => void;
  selectedGroup: string;
};

const groupOptions = "ABCDEFGHIJKL".split("");

export function FixtureFilters({
  activeFilter,
  onFilterChange,
  onGroupChange,
  selectedGroup,
}: FixtureFiltersProps) {
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);

  function handleFilterClick(filter: FixtureFilter) {
    if (filter === "Group") {
      onFilterChange("Group");
      setGroupMenuOpen((isOpen) => (activeFilter === "Group" ? !isOpen : true));
      return;
    }

    onFilterChange(filter);
    setGroupMenuOpen(false);
  }

  return (
    <div className="fixture-filter-area">
      <div
        className="filter-row fixture-filter-row fixture-filter-row-fill"
        aria-label="Fixture filters"
      >
        {fixtureFilters.map((filter) => (
          <button
            key={filter}
            aria-controls={filter === "Group" ? "fixture-group-options" : undefined}
            aria-expanded={filter === "Group" ? groupMenuOpen : undefined}
            aria-haspopup={filter === "Group" ? "listbox" : undefined}
            aria-pressed={activeFilter === filter}
            className={[
              "filter-chip",
              "fixture-filter-chip",
              filter === "Group" ? "fixture-filter-chip-group" : "",
              activeFilter === filter ? "active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            type="button"
            onClick={() => handleFilterClick(filter)}
          >
            {filter}
            {filter === "Group" ? (
              <ChevronDown
                aria-hidden="true"
                className={groupMenuOpen ? "fixture-group-chevron open" : "fixture-group-chevron"}
                size={16}
                strokeWidth={2.2}
              />
            ) : null}
          </button>
        ))}
      </div>

      {groupMenuOpen ? (
        <div
          aria-label="Select group"
          className="fixture-group-menu"
          id="fixture-group-options"
          role="listbox"
        >
          {groupOptions.map((group) => (
            <button
              key={group}
              aria-selected={selectedGroup === group}
              className={`fixture-group-option${selectedGroup === group ? " selected" : ""}`}
              role="option"
              type="button"
              onClick={() => {
                onGroupChange(group);
                onFilterChange("Group");
                setGroupMenuOpen(false);
              }}
            >
              Group {group}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

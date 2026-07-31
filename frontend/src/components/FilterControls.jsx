function FilterControls({
  typeFilter,
  setTypeFilter,
  sortType,
  setSortType,
  teamFilter,
  setTeamFilter,
  positionFilter,
  setPositionFilter,
  handleResetFilters,
}) {
  return (
    <div className="filter-controls mx-auto mt-6 grid w-full max-w-4xl gap-4 md:grid-cols-2 lg:grid-cols-4">
      <select
        value={typeFilter}
        onChange={(event) => {
          setTypeFilter(event.target.value);
          setSortType("name");
        }}
      >
        <option value="All">All Player Types</option>
        <option value="hitter">Hitters</option>
        <option value="pitcher">Pitchers</option>
      </select>

      <select
        value={sortType}
        onChange={(event) => setSortType(event.target.value)}
      >
        <option value="name">Sort by name</option>

        {typeFilter === "hitter" && (
          <>
            <option value="homeRuns">Sort by home runs</option>
            <option value="battingAverage">Sort by batting average</option>
          </>
        )}

        {typeFilter === "pitcher" && (
          <>
            <option value="era">Sort by ERA</option>
            <option value="strikeouts">Sort by strikeouts</option>
          </>
        )}
      </select>

      <select
        value={teamFilter}
        onChange={(event) => setTeamFilter(event.target.value)}
      >
        <option value="All">All Teams</option>
        <option value="Dodgers">Dodgers</option>
        <option value="Angels">Angels</option>
        <option value="Yankees">Yankees</option>
        <option value="Padres">Padres</option>
        <option value="Giants">Giants</option>
        <option value="D-backs">D-backs</option>
        <option value="Rockies">Rockies</option>
        <option value="Brewers">Brewers</option>
        <option value="Cardinals">Cardinals</option>
      </select>

      <select
        value={positionFilter}
        onChange={(event) => setPositionFilter(event.target.value)}
      >
        <option value="All">All Positions</option>
        <option value="Pitcher">Pitcher</option>
        <option value="Catcher">Catcher</option>
        <option value="First Base">First Base</option>
        <option value="Second Base">Second Base</option>
        <option value="Third Base">Third Base</option>
        <option value="Shortstop">Shortstop</option>
        <option value="Outfielder">Outfielder</option>
        <option value="Designated Hitter">Designated Hitter</option>
      </select>

      <button
        className="reset-button transition duration-200 hover:-translate-y-0.5"
        type="button"
        onClick={handleResetFilters}
      >
        Reset Filters
      </button>
    </div>
  );
}

export default FilterControls;

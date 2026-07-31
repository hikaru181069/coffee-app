function TeamCard({ team, selected, handleSelectTeam }) {
  const logoUrl = `https://www.mlbstatic.com/team-logos/${team.id}.svg`;

  return (
    <button
      className={`team-card ${selected ? "selected" : ""}`}
      type="button"
      onClick={() => handleSelectTeam(team)}
    >
      <img
        src={logoUrl}
        alt={team.name}
        className="team-card-logo"
        onError={(e) => { e.currentTarget.style.display = "none"; }}
      />
      <span className="team-card-name">{team.name}</span>
    </button>
  );
}

export default TeamCard;

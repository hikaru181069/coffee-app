import PlayerCard from "./PlayerCard";

function PlayerSection({ title, description, players }) {
  return (
    <section className="home-player-section">
      <div className="section-heading">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <div className="player-list">
        {players.map((player) => (
          <PlayerCard key={player.playerId} player={player} />
        ))}
      </div>
    </section>
  );
}

export default PlayerSection;

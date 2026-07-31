import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, RotateCcw, TrendingUp, Zap } from "lucide-react";

import { getAuthToken } from "../utils/authStorage";
import { getQuizRecommendations } from "../services/api/recommendationApi";
import ErrorCard from "../components/ErrorCard";

const HEADSHOT_URL = (id) =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${id}/headshot/67/current`;

// ── クイズ設定 ──────────────────────────────────────────────────────────────

const HITTER_QUESTIONS = [
  {
    id: "style",
    question: "What batting style do you like?",
    options: [
      { value: "power",    label: "Power",    desc: "Home runs & slugging" },
      { value: "speed",    label: "Speed",    desc: "Stolen bases & baserunning" },
      { value: "contact",  label: "Contact",  desc: "High batting average" },
      { value: "balanced", label: "Balanced", desc: "All-around excellence (OPS)" },
    ],
  },
  {
    id: "age",
    question: "Age group?",
    options: [
      { value: "young", label: "Rising Stars", desc: "25 years old and under" },
      { value: "prime", label: "Prime",        desc: "Ages 26 – 32" },
      { value: "any",   label: "Any",          desc: "No preference" },
    ],
  },
  {
    id: "league",
    question: "Which league?",
    options: [
      { value: "AL",   label: "American League", desc: "AL teams only" },
      { value: "NL",   label: "National League", desc: "NL teams only" },
      { value: "both", label: "Both",            desc: "No preference" },
    ],
  },
];

const PITCHER_QUESTIONS = [
  {
    id: "style",
    question: "What pitching style do you like?",
    options: [
      { value: "power",     label: "Power Pitcher",  desc: "Strikeout dominance" },
      { value: "control",   label: "Control Artist", desc: "Low walks, low WHIP" },
      { value: "ace",       label: "Ace",            desc: "Low ERA, game changer" },
      { value: "workhorse", label: "Workhorse",      desc: "Deep into games, high IP" },
    ],
  },
  {
    id: "position",
    question: "Starter or Reliever?",
    options: [
      { value: "starter",  label: "Starter",  desc: "Takes the mound every 5 days" },
      { value: "reliever", label: "Reliever", desc: "High-leverage bullpen arms" },
      { value: "both",     label: "Both",     desc: "No preference" },
    ],
  },
  {
    id: "age",
    question: "Age group?",
    options: [
      { value: "young", label: "Rising Stars", desc: "25 years old and under" },
      { value: "prime", label: "Prime",        desc: "Ages 26 – 32" },
      { value: "any",   label: "Any",          desc: "No preference" },
    ],
  },
];

const DEFAULT_HITTER_ANSWERS  = { style: "balanced", age: "any", league: "both" };
const DEFAULT_PITCHER_ANSWERS = { style: "ace", position: "both", age: "any" };

// ── 選択肢ボタン ───────────────────────────────────────────────────────────
function QuizOption({ option, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`quiz-option${selected ? " selected" : ""}`}
      onClick={() => onSelect(option.value)}
    >
      <span className="quiz-option-label">{option.label}</span>
      <span className="quiz-option-desc">{option.desc}</span>
    </button>
  );
}

// ── 結果カード ─────────────────────────────────────────────────────────────
function ResultCard({ player, rank }) {
  return (
    <Link to={`/players/${player.playerId}`} className="quiz-result-card">
      <span className="quiz-result-rank">{rank}</span>
      <div className="quiz-result-headshot">
        <img
          src={HEADSHOT_URL(player.playerId)}
          alt={player.playerName}
          className="quiz-result-img"
          onError={(e) => { e.currentTarget.style.opacity = "0.3"; }}
        />
        {player.teamId && (
          <img
            src={`https://www.mlbstatic.com/team-logos/${player.teamId}.svg`}
            alt={player.teamName}
            className="quiz-result-team-badge"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        )}
      </div>
      <div className="quiz-result-info">
        <span className="quiz-result-name">{player.playerName}</span>
        <span className="quiz-result-team">{player.teamName}</span>
      </div>
      <div className="quiz-result-stat">
        <span className="quiz-result-value">{player.stat}</span>
        <span className="quiz-result-statlabel">{player.statLabel}</span>
      </div>
    </Link>
  );
}

// ── メインページ ───────────────────────────────────────────────────────────
function RecommendationsPage() {
  const [step, setStep]       = useState("type");
  const [type, setType]       = useState(null);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const token     = getAuthToken();
  const questions = type === "pitcher" ? PITCHER_QUESTIONS : HITTER_QUESTIONS;
  const defaults  = type === "pitcher" ? DEFAULT_PITCHER_ANSWERS : DEFAULT_HITTER_ANSWERS;
  const merged    = { ...defaults, ...answers };

  const handleTypeSelect = (t) => {
    setType(t);
    setAnswers({});
    setStep("questions");
  };

  const handleAnswer = (qId, val) => setAnswers((prev) => ({ ...prev, [qId]: val }));

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const players = await getQuizRecommendations(token, {
        type,
        style:    merged.style,
        age:      merged.age,
        league:   merged.league    ?? "both",
        position: merged.position  ?? "both",
      });
      setResults(players);
      setStep("results");
    } catch (err) {
      setError(err.message || "Failed to fetch recommendations.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep("type");
    setType(null);
    setAnswers({});
    setResults([]);
    setError("");
  };

  // ─── Step: type ──────────────────────────────────────────────────────────
  if (step === "type") {
    return (
      <div className="quiz-page">
        <div className="quiz-container">
          <div className="quiz-header">
            <h1 className="quiz-title">Find Your Next Favorite Player</h1>
            <p className="quiz-subtitle">
              Answer 3 quick questions to discover MLB players you might love.
            </p>
          </div>
          <div className="quiz-type-cards">
            <button className="quiz-type-card" onClick={() => handleTypeSelect("hitter")}>
              <span className="quiz-type-icon"><TrendingUp size={28} strokeWidth={1.75} /></span>
              <span className="quiz-type-label">Hitters</span>
              <span className="quiz-type-desc">Batting average, home runs, stolen bases</span>
            </button>
            <button className="quiz-type-card" onClick={() => handleTypeSelect("pitcher")}>
              <span className="quiz-type-icon"><Zap size={28} strokeWidth={1.75} /></span>
              <span className="quiz-type-label">Pitchers</span>
              <span className="quiz-type-desc">ERA, strikeouts, WHIP, innings pitched</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step: questions ─────────────────────────────────────────────────────
  if (step === "questions") {
    const allAnswered = questions.every((q) => merged[q.id]);
    return (
      <div className="quiz-page">
        <div className="quiz-container">
          <button className="quiz-back-btn" onClick={handleReset}>
            <ChevronLeft size={16} />
            Back
          </button>
          <div className="quiz-header">
            <p className="quiz-kicker">{type === "pitcher" ? "Pitchers" : "Hitters"}</p>
            <h1 className="quiz-title">What kind of player are you looking for?</h1>
          </div>

          <div className="quiz-questions">
            {questions.map((q, i) => (
              <div key={q.id} className="quiz-question-block">
                <p className="quiz-question-label">
                  <span className="quiz-question-num">{i + 1}</span>
                  {q.question}
                </p>
                <div className="quiz-options">
                  {q.options.map((opt) => (
                    <QuizOption
                      key={opt.value}
                      option={opt}
                      selected={merged[q.id] === opt.value}
                      onSelect={(val) => handleAnswer(q.id, val)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {error && <ErrorCard message={error} />}

          <button
            className="quiz-submit-btn"
            onClick={handleSubmit}
            disabled={loading || !allAnswered}
          >
            {loading ? "Searching..." : "Find Players →"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Step: results ───────────────────────────────────────────────────────
  return (
    <div className="quiz-page">
      <div className="quiz-container">
        <div className="quiz-header">
          <p className="quiz-kicker">
            {type === "pitcher" ? "Pitchers" : "Hitters"} · {merged.style}
          </p>
          <h1 className="quiz-title">Your Recommended Players</h1>
          <p className="quiz-subtitle">
            Click any player to see the full scouting report.
          </p>
        </div>

        {results.length > 0 ? (
          <div className="quiz-results">
            {results.map((p, i) => (
              <ResultCard key={p.playerId} player={p} rank={i + 1} />
            ))}
          </div>
        ) : (
          <div className="home-empty-state">
            <p className="empty-state-title">No players found</p>
            <p className="empty-state-desc">Try different answers to find matching players.</p>
          </div>
        )}

        <button className="quiz-reset-btn" onClick={handleReset}>
          <RotateCcw size={15} />
          Try Again
        </button>
      </div>
    </div>
  );
}

export default RecommendationsPage;

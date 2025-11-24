export default function LoginScreen({ username, setUsername, onPlayClick }) {
  return (
    <div className="login-screen">
      <input
        type="text"
        placeholder="Choose a Nickname"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && onPlayClick()}
      />
      <button className="btn btn-green" onClick={onPlayClick}>
        🎮 Play!
      </button>
    </div>
  )
}

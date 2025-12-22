export async function reportMatchResult(result: any) {
  const USERS_API_URL = process.env.USERS_API_URL || 'http://users:4000'; // Docker network name
  try {
    const response = await fetch(`${USERS_API_URL}/game/match-result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    });
    if (!response.ok) {
      console.error('Failed to report match result:', await response.text());
    }
  } catch (err) {
    console.error('Error reporting match result:', err);
  }
}

export async function reportTournamentResult(result: any) {
  const USERS_API_URL = process.env.USERS_API_URL || 'http://users:4000'; // Docker network name
  try {
    const response = await fetch(`${USERS_API_URL}/game/tournament-result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    });
    if (!response.ok) {
      console.error('Failed to report match result:', await response.text());
    }
  } catch (err) {
    console.error('Error reporting match result:', err);
  }
}

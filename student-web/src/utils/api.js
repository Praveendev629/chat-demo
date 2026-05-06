const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

export const createStudent = async (name) => {
  const res = await fetch(`${BACKEND_URL}/api/create-student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create student');
  return res.json();
};

export const fetchMessages = async (userId) => {
  const res = await fetch(`${BACKEND_URL}/api/messages/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
};

export const fetchAdmin = async () => {
  const res = await fetch(`${BACKEND_URL}/api/admin`);
  if (!res.ok) throw new Error('Failed to fetch admin');
  return res.json();
};

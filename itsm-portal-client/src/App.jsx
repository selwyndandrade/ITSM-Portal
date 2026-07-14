import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    axios
      .get("https://localhost:7060/api/tickets", {
        headers: {
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzMzgxOTM1ZC1mZjJhLTQxMjUtYTY0NC01MTc1NmI5MWI3ZTciLCJlbWFpbCI6InNlbHd5bkBleGFtcGxlLmNvbSIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IlVzZXIiLCJqdGkiOiJlZTJhNmQ5OS03YzllLTQ5MzMtOWIxOS01MGM5MTM4YmEwYzIiLCJleHAiOjE3ODQwNzA4MzYsImlzcyI6IklUU00uUG9ydGFsLkFQSSIsImF1ZCI6IklUU00uUG9ydGFsLkNsaWVudCJ9.3YQU8tk6Xd7zV5AqRSzacl-SxBS5v3Rbg7RV1atu6lo   "
        }
      })
      .then((response) => {
        setTickets(response.data);
      })
      .catch((error) => {
        console.log("API Error:", error);
      });
  }, []);

  return (
    <div>
      <h1>ITSM Portal</h1>

      <h2>Dashboard</h2>

      <p>Total Tickets: {tickets.length}</p>

      <p>
        Open Tickets:{" "}
        {tickets.filter((ticket) => ticket.status === "Open").length}
      </p>

      <h2>Tickets</h2>

      {tickets.map((ticket) => (
        <div key={ticket.id}>
          <h3>{ticket.title}</h3>
          <p>{ticket.description}</p>
          <p>Priority: {ticket.priority}</p>
          <p>Status: {ticket.status}</p>
          <hr />
        </div>
      ))}
    </div>
  );
}

export default App;
import { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './index.css';

const API_BASE = 'http://localhost:5000/api';
const COLORS = ['#38bdf8', '#818cf8', '#10b981', '#f43f5e', '#eab308', '#a855f7'];

function OverviewPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/kpis`).then(res => setData(res.data));
  }, []);

  if (!data) return <div className="header">Loading...</div>;

  return (
    <div>
      <h2 className="section-title">National Overview</h2>
      
      <div className="grid-4">
        <div className="card kpi-card">
          <div className="kpi-label">Total Elections</div>
          <div className="kpi-value">{data.metrics.total_elections}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Total Parties Participated</div>
          <div className="kpi-value">{data.metrics.total_parties}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Total Constituencies</div>
          <div className="kpi-value">{data.metrics.total_const}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-label">Average Voter Turnout</div>
          <div className="kpi-value">{data.metrics.avg_turnout?.toFixed(1)}%</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{marginBottom: '1rem', color: '#94a3b8'}}>Voter Turnout Trend</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.turnout_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="election_year_clean" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" domain={['auto', 'auto']} />
                <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', color: '#fff'}} />
                <Line type="monotone" dataKey="avg_turnout" name="Avg Turnout (%)" stroke="#38bdf8" strokeWidth={3} dot={{r: 4}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3 style={{marginBottom: '1rem', color: '#94a3b8'}}>Total Votes Polled Over Time</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.votes_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="election_year_clean" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" tickFormatter={(val) => `${(val/1000000).toFixed(0)}M`} />
                <Tooltip formatter={(value) => new Intl.NumberFormat('en').format(value)} contentStyle={{backgroundColor: '#1e293b', border: 'none'}} />
                <Bar dataKey="total_votes" name="Total Votes" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StateAnalysisPage() {
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/states`).then(res => {
      setStates(res.data);
      setSelectedState(res.data[0]);
    });
  }, []);

  useEffect(() => {
    if (selectedState) {
      axios.get(`${API_BASE}/states/${encodeURIComponent(selectedState)}`).then(res => setData(res.data));
    }
  }, [selectedState]);

  return (
    <div>
      <h2 className="section-title">State-level Deep Dive</h2>
      <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)}>
        {states.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {data && (
        <>
          <div className="grid-3">
            <div className="card kpi-card">
              <div className="kpi-label">Historical Constituencies</div>
              <div className="kpi-value">{data.metrics.seats}</div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Highest Individual Vote Share</div>
              <div className="kpi-value">{data.metrics.max_share?.toFixed(1)}%</div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Most Historical Wins</div>
              <div className="kpi-value">{data.dominant_party?.party_abbr_clean || 'N/A'}</div>
            </div>
          </div>

          <div className="card">
            <h3 style={{marginBottom: '1rem', color: '#94a3b8'}}>Seat Distribution Over Time</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.seats_distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="election_year_clean" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none'}} />
                  <Bar dataKey="seats_won" name="Seats Won" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PartyPerformancePage() {
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/parties`).then(res => {
      setParties(res.data);
      const def = res.data.includes('INC') ? 'INC' : res.data[0];
      setSelectedParty(def);
    });
  }, []);

  useEffect(() => {
    if (selectedParty) {
      axios.get(`${API_BASE}/parties/${encodeURIComponent(selectedParty)}`).then(res => setData(res.data));
    }
  }, [selectedParty]);

  return (
    <div>
      <h2 className="section-title">Political Party Tracker</h2>
      <select value={selectedParty} onChange={(e) => setSelectedParty(e.target.value)}>
        {parties.map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      {data && (
        <>
          <div className="grid-3">
            <div className="card kpi-card">
              <div className="kpi-label">Total Seats Won</div>
              <div className="kpi-value">{data.metrics.total_wins || 0}</div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Strike Rate</div>
              <div className="kpi-value">
                {((data.metrics.total_wins || 0) / (data.metrics.total_contested || 1) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Average Vote Share</div>
              <div className="kpi-value">{data.metrics.avg_share?.toFixed(1)}%</div>
            </div>
          </div>

          <div className="card">
            <h3 style={{marginBottom: '1rem', color: '#94a3b8'}}>Electoral Trajectory (Seats Won)</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trajectory}>
                  <defs>
                    <linearGradient id="colorSeats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="election_year_clean" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none'}} />
                  <Area type="monotone" dataKey="seats" name="Seats" stroke="#f43f5e" fillOpacity={1} fill="url(#colorSeats)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CoalitionInsightsPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/coalitions`).then(res => setData(res.data));
  }, []);

  if (!data) return <div className="header">Loading...</div>;

  return (
    <div>
      <h2 className="section-title">Coalitions & Advanced Features</h2>
      
      <div className="grid-2">
        <div className="card">
          <h3 style={{marginBottom: '1rem', color: '#94a3b8'}}>Alliance Win Rates</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.alliances}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="alliance" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none'}} />
                <Bar dataKey="wins" name="Wins" fill="#eab308" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h3 style={{marginBottom: '1rem', color: '#94a3b8'}}>Incumbency Advantage</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.incumbency}
                  dataKey="wins"
                  nameKey="is_incumbent"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  innerRadius={80}
                  fill="#8884d8"
                  label={(entry) => entry.is_incumbent === 1 ? 'Incumbent' : 'Challenger'}
                >
                  {data.incumbency.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{marginBottom: '1rem', color: '#94a3b8'}}>Fragmentation Index Over Time</h3>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.fragmentation}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="election_year_clean" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none'}} />
              <Line type="monotone" dataKey="avg_frag" name="Avg Fragmentation" stroke="#a855f7" strokeWidth={3} dot={{r: 4}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [currentPage, setCurrentPage] = useState('Overview');
  const pages = ['Overview', 'State Analysis', 'Party Performance', 'Coalition Insights'];

  return (
    <div className="dashboard-container">
      <div className="header">
        <h1>🇮🇳 Indian Democratic Index</h1>
        <p>Comprehensive Electoral Analysis (1951 - 2024)</p>
      </div>

      <div className="nav-bar">
        {pages.map(page => (
          <button 
            key={page}
            className={`nav-btn ${currentPage === page ? 'active' : ''}`}
            onClick={() => setCurrentPage(page)}
          >
            {page}
          </button>
        ))}
      </div>

      {currentPage === 'Overview' && <OverviewPage />}
      {currentPage === 'State Analysis' && <StateAnalysisPage />}
      {currentPage === 'Party Performance' && <PartyPerformancePage />}
      {currentPage === 'Coalition Insights' && <CoalitionInsightsPage />}
    </div>
  );
}

export default App;

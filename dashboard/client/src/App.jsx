import { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Sun, Moon, Menu, X } from 'lucide-react';
import './index.css';

const COLORS = ['#38bdf8', '#818cf8', '#10b981', '#f43f5e', '#eab308', '#a855f7'];

function OverviewPage() {
  const [data, setData] = useState(null);
  const [startYear, setStartYear] = useState(1951);
  const [endYear, setEndYear] = useState(2024);
  const [summary1, setSummary1] = useState("");
  const [summary2, setSummary2] = useState("");

  useEffect(() => {
    axios.get(`${import.meta.env.BASE_URL}data/kpis.json`).then(res => {
      if (typeof res.data === 'object' && res.data !== null && res.data.metrics) {
        setData(res.data);
      } else {
        console.error("Invalid data format received.");
        setData("ERROR");
      }
    }).catch(err => {
      console.error(err);
      setData("ERROR");
    });
  }, []);

  if (data === "ERROR") return <div style={{padding: '2rem'}}><h3>Data Not Found</h3><p>Please run <code>python main.py</code> to generate the dashboard data.</p></div>;
  if (!data) return <div style={{padding: '2rem'}}>Loading Overview...</div>;

  const filteredTurnout = data.turnout_trend?.filter(d => d.election_year_clean >= startYear && d.election_year_clean <= endYear) || [];
  const filteredVotes = data.votes_trend?.filter(d => d.election_year_clean >= startYear && d.election_year_clean <= endYear) || [];
  
  const filteredAvgTurnout = filteredTurnout.length > 0 ? (filteredTurnout.reduce((acc, curr) => acc + curr.avg_turnout, 0) / filteredTurnout.length) : 0;
  const filteredTotalVotes = filteredVotes.reduce((acc, curr) => acc + curr.total_votes, 0);

  // Dynamic default summaries
  const defaultSum1 = `Between ${startYear} and ${endYear}, the national average voter turnout across ${filteredTurnout.length} elections was ${filteredAvgTurnout.toFixed(1)}%.`;
  const defaultSum2 = `During the ${startYear}-${endYear} period, an aggregate total of ${(filteredTotalVotes / 1000000).toFixed(1)} Million votes were cast nationally.`;

  return (
    <div className="page-container">
      <h2 className="section-title">National Overview</h2>
      
      <div className="filters-row">
        <div className="filter-group">
          <label>Start Year</label>
          <input type="number" value={startYear} min={1951} max={2024} onChange={e => setStartYear(Number(e.target.value))} />
        </div>
        <div className="filter-group">
          <label>End Year</label>
          <input type="number" value={endYear} min={1951} max={2024} onChange={e => setEndYear(Number(e.target.value))} />
        </div>
      </div>

      <div className="grid-4">
        <div className="card kpi-card">
          <div className="kpi-label">Lok Sabha Elections</div>
          <div className="kpi-value">{filteredVotes.length}</div>
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
          <div className="kpi-value">{filteredAvgTurnout.toFixed(1)}%</div>
        </div>
      </div>

      <div className="chart-layout">
        <div className="chart-main">
          <h3 style={{marginBottom: '1rem', color: 'var(--text-muted)'}}>Voter Turnout Trend</h3>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={filteredTurnout} onClick={(e) => {
              if (e && e.activePayload) {
                setSummary1(`In ${e.activePayload[0].payload.election_year_clean}, the average voter turnout across all constituencies was ${e.activePayload[0].value.toFixed(2)}%.`);
              }
            }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="election_year_clean" stroke="var(--chart-text)" />
              <YAxis stroke="var(--chart-text)" domain={['auto', 'auto']} />
              <Tooltip contentStyle={{backgroundColor: 'var(--chart-tooltip-bg)', border: 'none', color: 'var(--chart-text)'}} />
              <Line type="monotone" dataKey="avg_turnout" name="Avg Turnout (%)" stroke="#38bdf8" strokeWidth={3} dot={{r: 4}} activeDot={{r: 8, cursor: 'pointer'}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-summary">
          <div className="summary-title">Insight</div>
          <div className="summary-text">{summary1 || defaultSum1}</div>
        </div>
      </div>

      <div className="chart-layout">
        <div className="chart-main">
          <h3 style={{marginBottom: '1rem', color: 'var(--text-muted)'}}>Total Votes Polled Over Time</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={filteredVotes} onClick={(e) => {
              if (e && e.activePayload) {
                setSummary2(`In ${e.activePayload[0].payload.election_year_clean}, a massive ${new Intl.NumberFormat('en').format(e.activePayload[0].value)} votes were cast nationally.`);
              }
            }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="election_year_clean" stroke="var(--chart-text)" />
              <YAxis stroke="var(--chart-text)" tickFormatter={(val) => `${(val/1000000).toFixed(0)}M`} />
              <Tooltip formatter={(value) => new Intl.NumberFormat('en').format(value)} contentStyle={{backgroundColor: 'var(--chart-tooltip-bg)', border: 'none', color: 'var(--chart-text)'}} />
              <Bar dataKey="total_votes" name="Total Votes" fill="#818cf8" radius={[4, 4, 0, 0]} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-summary">
          <div className="summary-title">Insight</div>
          <div className="summary-text">{summary2 || defaultSum2}</div>
        </div>
      </div>
    </div>
  );
}

function StateAnalysisPage() {
  const [statesList, setStatesList] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [stateDetails, setStateDetails] = useState(null);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    axios.get(`${import.meta.env.BASE_URL}data/states_list.json`).then(res => {
      if (Array.isArray(res.data)) {
        setStatesList(res.data);
        if (res.data.length > 0) setSelectedState(res.data[0]);
      } else {
        setStatesList(["ERROR"]);
      }
    }).catch(console.error);
    
    axios.get(`${import.meta.env.BASE_URL}data/state_details.json`).then(res => {
      if (typeof res.data === 'object' && res.data !== null) {
        setStateDetails(res.data);
      }
    }).catch(console.error);
  }, []);

  if (statesList[0] === "ERROR") return <div style={{padding: '2rem'}}><h3>Data Not Found</h3><p>Please run <code>python main.py</code> to generate the dashboard data.</p></div>;


  const currentData = stateDetails && selectedState ? stateDetails[selectedState] : null;
  const defaultSum = currentData ? `In ${selectedState}, the dominant party is ${currentData.dominant_party?.party_abbr_clean || 'Unknown'}, with a historical high vote share of ${currentData.metrics.max_share?.toFixed(1) || 0}%. A total of ${currentData.metrics.seats} seats are represented.` : "";

  return (
    <div className="page-container">
      <h2 className="section-title">State-level Deep Dive</h2>
      
      <div className="filters-row">
        <div className="filter-group">
          <label>Select State / Union Territory</label>
          <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)}>
            {statesList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {currentData ? (
        <>
          <div className="grid-3">
            <div className="card kpi-card">
              <div className="kpi-label">Historical Constituencies</div>
              <div className="kpi-value">{currentData.metrics.seats}</div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Highest Individual Vote Share</div>
              <div className="kpi-value">{currentData.metrics.max_share?.toFixed(1)}%</div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Most Historical Wins</div>
              <div className="kpi-value">{currentData.dominant_party?.party_abbr_clean || 'N/A'}</div>
            </div>
          </div>

          <div className="chart-layout">
            <div className="chart-main">
              <h3 style={{marginBottom: '1rem', color: 'var(--text-muted)'}}>Seat Distribution Over Time</h3>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={currentData.seats_distribution} onClick={(e) => {
                  if (e && e.activePayload) {
                    const p = e.activePayload[0].payload;
                    setSummary(`In ${p.election_year_clean}, the party '${p.party_abbr_clean}' won ${p.seats_won} seat(s) in ${selectedState}.`);
                  }
                }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="election_year_clean" stroke="var(--chart-text)" />
                  <YAxis stroke="var(--chart-text)" />
                  <Tooltip contentStyle={{backgroundColor: 'var(--chart-tooltip-bg)', border: 'none', color: 'var(--chart-text)'}} />
                  <Bar dataKey="seats_won" name="Seats Won" fill="#10b981" radius={[4, 4, 0, 0]} cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-summary">
              <div className="summary-title">Insight</div>
              <div className="summary-text">{summary || defaultSum}</div>
            </div>
          </div>
        </>
      ) : (
        <div>Loading State Data...</div>
      )}
    </div>
  );
}

function PartyPerformancePage() {
  const [partiesMeta, setPartiesMeta] = useState([]);
  const [allPartyDetails, setAllPartyDetails] = useState(null);
  const [selectedParty, setSelectedParty] = useState('');
  
  // Year Range Filter
  const [startYear, setStartYear] = useState(1951);
  const [endYear, setEndYear] = useState(2024);
  
  const [summary, setSummary] = useState("");

  useEffect(() => {
    axios.get(`${import.meta.env.BASE_URL}data/parties_list.json`).then(res => {
      if (Array.isArray(res.data)) {
        setPartiesMeta(res.data);
        const def = res.data.find(p => p.party_abbr_clean === 'INC') ? 'INC' : res.data[0]?.party_abbr_clean;
        if (def) setSelectedParty(def);
      } else {
        setPartiesMeta([{party_abbr_clean: "ERROR", active_years: []}]);
      }
    }).catch(console.error);
    
    axios.get(`${import.meta.env.BASE_URL}data/party_details.json`).then(res => {
      if (typeof res.data === 'object' && res.data !== null) {
        setAllPartyDetails(res.data);
      }
    }).catch(console.error);
  }, []);

  if (partiesMeta.length > 0 && partiesMeta[0].party_abbr_clean === "ERROR") return <div style={{padding: '2rem'}}><h3>Data Not Found</h3><p>Please run <code>python main.py</code> to generate the dashboard data.</p></div>;


  // Filter parties based on active year range and SORT alphabetically
  const filteredParties = partiesMeta.filter(p => {
    return p.active_years.some(y => y >= startYear && y <= endYear);
  }).sort((a, b) => a.party_abbr_clean.localeCompare(b.party_abbr_clean));
  
  // If selected party is filtered out, reset it
  useEffect(() => {
    if (filteredParties.length > 0 && !filteredParties.find(p => p.party_abbr_clean === selectedParty)) {
      setSelectedParty(filteredParties[0].party_abbr_clean);
    }
  }, [startYear, endYear, filteredParties, selectedParty]);

  const currentData = allPartyDetails && selectedParty ? allPartyDetails[selectedParty] : null;
  
  // Apply year filter to chart data
  const chartData = currentData?.trajectory?.filter(d => d.election_year_clean >= startYear && d.election_year_clean <= endYear) || [];
  
  const totalWinsInRange = chartData.reduce((acc, curr) => acc + curr.seats, 0);
  const strikeRate = ((currentData?.metrics.total_wins || 0) / (currentData?.metrics.total_contested || 1) * 100).toFixed(1);
  const defaultSum = `Between ${startYear} and ${endYear}, ${selectedParty} won a total of ${totalWinsInRange} seats. Overall historically, they maintain a strike rate of ${strikeRate}% with an average vote share of ${currentData?.metrics.avg_share?.toFixed(1) || 0}%.`;

  return (
    <div className="page-container">
      <h2 className="section-title">Political Party Tracker</h2>
      
      <div className="filters-row">
        <div className="filter-group" style={{flex: 0.5}}>
          <label>Start Year</label>
          <input type="number" value={startYear} min={1951} max={2024} onChange={e => setStartYear(Number(e.target.value))} />
        </div>
        <div className="filter-group" style={{flex: 0.5}}>
          <label>End Year</label>
          <input type="number" value={endYear} min={1951} max={2024} onChange={e => setEndYear(Number(e.target.value))} />
        </div>
        <div className="filter-group" style={{flex: 2}}>
          <label>Select Active Party ({filteredParties.length} found)</label>
          <select value={selectedParty} onChange={(e) => setSelectedParty(e.target.value)}>
            {filteredParties.map(p => <option key={p.party_abbr_clean} value={p.party_abbr_clean}>{p.party_abbr_clean}</option>)}
          </select>
        </div>
      </div>

      {currentData ? (
        <>
          <div className="grid-3">
            <div className="card kpi-card">
              <div className="kpi-label">Total Seats Won</div>
              <div className="kpi-value">{currentData.metrics.total_wins || 0}</div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Historical Strike Rate</div>
              <div className="kpi-value">
                {((currentData.metrics.total_wins || 0) / (currentData.metrics.total_contested || 1) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="card kpi-card">
              <div className="kpi-label">Average Vote Share</div>
              <div className="kpi-value">{currentData.metrics.avg_share?.toFixed(1)}%</div>
            </div>
          </div>

          <div className="chart-layout">
            <div className="chart-main">
              <h3 style={{marginBottom: '1rem', color: 'var(--text-muted)'}}>Electoral Trajectory (Seats Won)</h3>
              <ResponsiveContainer width="100%" height="90%">
                <AreaChart data={chartData} onClick={(e) => {
                  if (e && e.activePayload) {
                    setSummary(`In the ${e.activePayload[0].payload.election_year_clean} election, ${selectedParty} successfully secured ${e.activePayload[0].value} seats.`);
                  }
                }}>
                  <defs>
                    <linearGradient id="colorSeats" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="election_year_clean" stroke="var(--chart-text)" />
                  <YAxis stroke="var(--chart-text)" />
                  <Tooltip contentStyle={{backgroundColor: 'var(--chart-tooltip-bg)', border: 'none', color: 'var(--chart-text)'}} />
                  <Area type="monotone" dataKey="seats" name="Seats" stroke="#f43f5e" fillOpacity={1} fill="url(#colorSeats)" activeDot={{r: 8, cursor: 'pointer'}} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-summary">
              <div className="summary-title">Insight</div>
              <div className="summary-text">{summary || defaultSum}</div>
            </div>
          </div>
        </>
      ) : (
        <div>No party data available for this range.</div>
      )}
    </div>
  );
}

function CoalitionInsightsPage() {
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState("");

  useEffect(() => {
    axios.get(`${import.meta.env.BASE_URL}data/coalitions.json`).then(res => {
      if (typeof res.data === 'object' && res.data !== null && res.data.alliances) {
        setData(res.data);
      } else {
        setData("ERROR");
      }
    }).catch(err => setData("ERROR"));
  }, []);

  if (data === "ERROR") return <div style={{padding: '2rem'}}><h3>Data Not Found</h3><p>Please run <code>python main.py</code> to generate the dashboard data.</p></div>;
  if (!data) return <div style={{padding: '2rem'}}>Loading Coalitions...</div>;

  const incWins = data.incumbency.find(d => d.is_incumbent === 1)?.wins || 0;
  const incTotal = data.incumbency.find(d => d.is_incumbent === 1)?.total || 1;
  const incRate = (incWins / incTotal * 100).toFixed(1);
  const defaultSum = `Incumbency plays a substantial role: historically, sitting incumbents have defended their seats ${incWins} times, maintaining a ${incRate}% win rate across ${incTotal} contested seats.`;

  return (
    <div className="page-container">
      <h2 className="section-title">Coalitions & Incumbency</h2>
      
      <div className="grid-2">
        <div className="card">
          <h3 style={{marginBottom: '1rem', color: 'var(--text-muted)'}}>Alliance Win Rates</h3>
          <div className="chart-container" style={{height: '300px'}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.alliances}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="alliance" stroke="var(--chart-text)" />
                <YAxis stroke="var(--chart-text)" />
                <Tooltip contentStyle={{backgroundColor: 'var(--chart-tooltip-bg)', border: 'none', color: 'var(--chart-text)'}} />
                <Bar dataKey="wins" name="Wins" fill="#eab308" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="chart-layout" style={{margin: 0, gridTemplateColumns: '1fr', padding: 0, border: 'none', background: 'transparent'}}>
          <div className="card" style={{height: '100%'}}>
            <h3 style={{marginBottom: '1rem', color: 'var(--text-muted)'}}>Incumbency Advantage</h3>
            <div className="chart-container" style={{height: '220px'}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.incumbency}
                    dataKey="wins"
                    nameKey="is_incumbent"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    cursor="pointer"
                    label={({ is_incumbent, percent }) => `${is_incumbent === 1 ? 'Incumbent' : 'Challenger'} ${(percent * 100).toFixed(0)}%`}
                    labelLine={true}
                    onClick={(e) => {
                      const type = e.is_incumbent === 1 ? 'Incumbents' : 'Challengers';
                      setSummary(`${type} have historically accounted for ${new Intl.NumberFormat('en').format(e.wins)} total victories out of ${new Intl.NumberFormat('en').format(e.total)} contested seats.`);
                    }}
                  >
                    {data.incumbency.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{backgroundColor: 'var(--chart-tooltip-bg)', border: 'none', color: 'var(--chart-text)'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-summary" style={{marginTop: '1rem', padding: '1rem'}}>
              <div className="summary-title">Insight</div>
              <div className="summary-text">{summary || defaultSum}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DataSourcesPage() {
  return (
    <div className="page-container">
      <h2 className="section-title">Data Sources</h2>
      
      <div className="card">
        <p style={{marginBottom: '1.5rem', color: 'var(--text-muted)'}}>
          The electoral and demographic data powering this dashboard has been aggregated from the following authoritative and open-source repositories:
        </p>

        <ul style={{listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          {/* OFFICIAL SOURCES */}
          <li style={{padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '6px', border: '1px solid var(--border-color)'}}>
            <h4 style={{marginBottom: '0.5rem', color: 'var(--primary-color)'}}>Literacy Rate from 1951 to 2011</h4>
            <a href="https://www.data.gov.in/resource/literacy-rate-1951-2011" target="_blank" rel="noopener noreferrer" style={{color: '#38bdf8', textDecoration: 'none'}}>View on Data.gov.in ↗</a>
          </li>

          <li style={{padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '6px', border: '1px solid var(--border-color)'}}>
            <h4 style={{marginBottom: '0.5rem', color: 'var(--primary-color)'}}>Census Tables</h4>
            <a href="https://censusindia.gov.in/census.website/data/census-tables" target="_blank" rel="noopener noreferrer" style={{color: '#38bdf8', textDecoration: 'none'}}>View on Census India ↗</a>
          </li>

          <li style={{padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '6px', border: '1px solid var(--border-color)'}}>
            <h4 style={{marginBottom: '0.5rem', color: 'var(--primary-color)'}}>State-wise SDP (1999-2000)</h4>
            <a href="https://www.mospi.gov.in/sites/default/files/press_releases_statements/statewise_sdp1999_2000_9sep10.pdf" target="_blank" rel="noopener noreferrer" style={{color: '#38bdf8', textDecoration: 'none'}}>View PDF (MOSPI) ↗</a>
          </li>

          <li style={{padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '6px', border: '1px solid var(--border-color)'}}>
            <h4 style={{marginBottom: '0.5rem', color: 'var(--primary-color)'}}>State-wise SDP (2011 to 2023)</h4>
            <a href="https://mospi.gov.in/sites/default/files/press_releases_statements/State_wise_SDP_as_on_15032024.xls" target="_blank" rel="noopener noreferrer" style={{color: '#38bdf8', textDecoration: 'none'}}>Download XLS (MOSPI) ↗</a>
          </li>

          {/* NON-OFFICIAL / AGGREGATED SOURCES */}
          <li style={{padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '6px', border: '1px solid var(--border-color)'}}>
            <h4 style={{marginBottom: '0.5rem', color: 'var(--primary-color)'}}>Comprehensive Lok Sabha Results 1951–2024</h4>
            <p style={{marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)'}}>State/constituency/party-wise votes, EVM/postal/total</p>
            <a href="https://dataful.in/datasets/19985/" target="_blank" rel="noopener noreferrer" style={{color: '#38bdf8', textDecoration: 'none'}}>View on Dataful ↗</a>
          </li>

          <li style={{padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '6px', border: '1px solid var(--border-color)'}}>
            <h4 style={{marginBottom: '0.5rem', color: 'var(--primary-color)'}}>Lok Sabha Elections 2024 Results</h4>
            <a href="https://data.opencity.in/dataset/parliamentary-elections-2024-results/resource/d164b73a-b855-4b68-be0c-0f3450e7ab9f" target="_blank" rel="noopener noreferrer" style={{color: '#38bdf8', textDecoration: 'none'}}>View on OpenCity ↗</a>
          </li>

          <li style={{padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '6px', border: '1px solid var(--border-color)'}}>
            <h4 style={{marginBottom: '0.5rem', color: 'var(--primary-color)'}}>Indian Election Detailed Results (1951 to 2019)</h4>
            <a href="https://www.kaggle.com/datasets/ramaasivashankar/indian-election-detailed-results-from-1951-to-2019?resource=download" target="_blank" rel="noopener noreferrer" style={{color: '#38bdf8', textDecoration: 'none'}}>View on Kaggle ↗</a>
          </li>

          <li style={{padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '6px', border: '1px solid var(--border-color)'}}>
            <h4 style={{marginBottom: '0.5rem', color: 'var(--primary-color)'}}>India Lok Sabha Elections Data (1962-2019)</h4>
            <a href="https://www.kaggle.com/datasets/prabinraj/india-loksabha-elections-data19622019/data" target="_blank" rel="noopener noreferrer" style={{color: '#38bdf8', textDecoration: 'none'}}>View on Kaggle ↗</a>
          </li>

          <li style={{padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '6px', border: '1px solid var(--border-color)'}}>
            <h4 style={{marginBottom: '0.5rem', color: 'var(--primary-color)'}}>Political Parties of India (1962-2021)</h4>
            <a href="https://www.kaggle.com/datasets/jehanbhathena/political-parties-of-india19622021" target="_blank" rel="noopener noreferrer" style={{color: '#38bdf8', textDecoration: 'none'}}>View on Kaggle ↗</a>
          </li>

          <li style={{padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '6px', border: '1px solid var(--border-color)'}}>
            <h4 style={{marginBottom: '0.5rem', color: 'var(--primary-color)'}}>India Election Data Parliament Elections (1951-2014)</h4>
            <a href="https://raw.githubusercontent.com/datameet/india-election-data/master/parliament-elections/parliament.csv" target="_blank" rel="noopener noreferrer" style={{color: '#38bdf8', textDecoration: 'none'}}>View Raw CSV (DataMeet) ↗</a>
          </li>

          <li style={{padding: '1rem', backgroundColor: 'var(--bg-main)', borderRadius: '6px', border: '1px solid var(--border-color)'}}>
            <h4 style={{marginBottom: '0.5rem', color: 'var(--primary-color)'}}>State-wise Decadal Change in National GDP Share (1960-2023)</h4>
            <a href="https://dataful.in/datasets/20245/" target="_blank" rel="noopener noreferrer" style={{color: '#38bdf8', textDecoration: 'none'}}>View on Dataful ↗</a>
          </li>
        </ul>
      </div>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState('dark');
  const [currentPage, setCurrentPage] = useState('Overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const pages = ['Overview', 'State Analysis', 'Party Performance', 'Coalition Insights', 'Data Sources'];

  // Theme Toggle Effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <div className="top-navbar" style={{ flexWrap: 'wrap', rowGap: '1rem', columnGap: '2rem' }}>
        <div className="brand-section">
          <div className="logo-icon">IN</div>
          <div className="brand-text">
            <h1>Indian Elections (1951-2024)</h1>
            <p>Comprehensive Electoral Analysis (1951 - 2024)</p>
          </div>
        </div>

        <div className="nav-actions" style={{ gap: '1.5rem' }}>
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <button className="theme-toggle" onClick={toggleTheme} title="Toggle Theme">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          {pages.map(page => (
            <button 
              key={page}
              className={`nav-btn ${currentPage === page ? 'active' : ''}`}
              onClick={() => { setCurrentPage(page); setIsMobileMenuOpen(false); }}
            >
              {page}
            </button>
          ))}
        </div>
      </div>

      <div style={{minHeight: 'calc(100vh - 120px)'}}>
        {currentPage === 'Overview' && <OverviewPage />}
        {currentPage === 'State Analysis' && <StateAnalysisPage />}
        {currentPage === 'Party Performance' && <PartyPerformancePage />}
        {currentPage === 'Coalition Insights' && <CoalitionInsightsPage />}
        {currentPage === 'Data Sources' && <DataSourcesPage />}
      </div>
      
      <footer className="app-footer">
        <div className="footer-left">
          Report by <a href="https://sgr-m.github.io/" target="_blank" rel="noopener noreferrer" style={{color: 'var(--text-main)', textDecoration: 'none', fontWeight: 'bold'}}>Sagar Maindola</a>
        </div>
        <div className="footer-right">
          <a href="https://github.com/sgr-m/Indian-Elections-Analysis-1947-2025" target="_blank" rel="noopener noreferrer" style={{color: 'var(--text-main)', textDecoration: 'none', fontWeight: 'bold'}}>View on GitHub ↗</a>
        </div>
      </footer>
    </>
  );
}

export default App;

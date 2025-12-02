import React, { useState, useEffect } from 'react';
import { AlertCircle, TrendingUp, Ruler, Target } from 'lucide-react';
import './App.css'; // Import normal CSS

const AsteroidDashboard = () => {
  const [asteroids, setAsteroids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('today');
  const [filterHazardous, setFilterHazardous] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  const API_KEY = 'VKYqaGLjPLsD6Ip9kkaEah4JhpjqqOajE0kqDn72'; 

  useEffect(() => {
    fetchAsteroids();
  }, [dateRange]);

  const fetchAsteroids = async () => {
    setLoading(true);
    setError(null);
    setSearchResult(null);

    try {
      const today = new Date();
      let startDate = today.toISOString().split('T')[0];
      let endDate = startDate;

      if (dateRange === 'week') {
        const weekLater = new Date(today);
        weekLater.setDate(weekLater.getDate() + 6);
        endDate = weekLater.toISOString().split('T')[0];
      }

      const response = await fetch(
        `https://api.nasa.gov/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}&api_key=${API_KEY}`
      );

      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();
      const allAsteroids = [];
      Object.keys(data.near_earth_objects).forEach(date => {
        allAsteroids.push(...data.near_earth_objects[date]);
      });

      setAsteroids(allAsteroids);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const searchAsteroid = async () => {
    if (!searchId.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://api.nasa.gov/neo/rest/v1/neo/${searchId}?api_key=${API_KEY}`
      );

      if (!response.ok) throw new Error('Asteroid not found');

      const data = await response.json();
      setSearchResult(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setSearchResult(null);
      setLoading(false);
    }
  };

  const getFilteredAndSortedAsteroids = () => {
    let filtered = [...asteroids];

    if (filterHazardous === 'hazardous') {
      filtered = filtered.filter(a => a.is_potentially_hazardous_asteroid);
    } else if (filterHazardous === 'safe') {
      filtered = filtered.filter(a => !a.is_potentially_hazardous_asteroid);
    }

    filtered.sort((a, b) => {
      const approachA = a.close_approach_data[0];
      const approachB = b.close_approach_data[0];

      switch (sortBy) {
        case 'distance':
          return parseFloat(approachA.miss_distance.kilometers) - 
                 parseFloat(approachB.miss_distance.kilometers);
        case 'speed':
          return parseFloat(approachB.relative_velocity.kilometers_per_second) - 
                 parseFloat(approachA.relative_velocity.kilometers_per_second);
        case 'size':
          return b.estimated_diameter.kilometers.estimated_diameter_max - 
                 a.estimated_diameter.kilometers.estimated_diameter_max;
        case 'date':
        default:
          return new Date(approachA.close_approach_date_full) - 
                 new Date(approachB.close_approach_date_full);
      }
    });

    return filtered;
  };

  const findClosestAsteroid = (asteroidList) => {
    if (asteroidList.length === 0) return null;
    
    let closest = asteroidList[0];
    let minDistance = parseFloat(closest.close_approach_data[0].miss_distance.kilometers);

    asteroidList.forEach(asteroid => {
      const distance = parseFloat(asteroid.close_approach_data[0].miss_distance.kilometers);
      if (distance < minDistance) {
        minDistance = distance;
        closest = asteroid;
      }
    });

    return closest;
  };

  const AsteroidCard = ({ asteroid, isClosest = false }) => {
    const approach = asteroid.close_approach_data[0];
    const isHazardous = asteroid.is_potentially_hazardous_asteroid;
    const diameterMin = asteroid.estimated_diameter.kilometers.estimated_diameter_min;
    const diameterMax = asteroid.estimated_diameter.kilometers.estimated_diameter_max;
    const speed = parseFloat(approach.relative_velocity.kilometers_per_second).toFixed(2);
    const distance = parseFloat(approach.miss_distance.kilometers).toFixed(0);
    const closeApproachDate = new Date(approach.close_approach_date_full).toLocaleString();

    return (
      <div className={`asteroid-card ${isHazardous ? 'hazardous' : 'safe'} ${isClosest ? 'closest' : ''}`}>
        {isClosest && <div className="closest-badge">⭐ CLOSEST</div>}
        <div className={`${isHazardous ? 'hazardous-badge' : 'safe-badge'}`}>
          {isHazardous ? '⚠️ HAZARDOUS' : '✓ SAFE'}
        </div>

        <h3>{asteroid.name}</h3>

        <div className="asteroid-info">
          <div className="asteroid-info-row">
            <span className="label"><Ruler size={16} /> Diameter</span>
            <span className="value">{diameterMin.toFixed(3)} - {diameterMax.toFixed(3)} km</span>
          </div>

          <div className="asteroid-info-row">
            <span className="label"><TrendingUp size={16} /> Speed</span>
            <span className="value">{speed} km/s</span>
          </div>

          <div className="asteroid-info-row">
            <span className="label"><Target size={16} /> Miss Distance</span>
            <span className="value">{Number(distance).toLocaleString()} km</span>
          </div>

          <div className="asteroid-info-row">
            <span className="label">🌍 Orbiting Body</span>
            <span className="value">{approach.orbiting_body}</span>
          </div>

          <div className="asteroid-info-row">
            <span className="label">📅 Closest Approach</span>
            <span className="value">{closeApproachDate}</span>
          </div>

          <div className="asteroid-info-row">
            <span className="label">🆔 ID</span>
            <span className="value">{asteroid.id}</span>
          </div>
        </div>
      </div>
    );
  };

  const Stats = () => {
    const hazardousCount = asteroids.filter(a => a.is_potentially_hazardous_asteroid).length;
    const closest = findClosestAsteroid(asteroids);
    const closestDistance = closest 
      ? (parseFloat(closest.close_approach_data[0].miss_distance.kilometers) / 1000).toFixed(0)
      : 0;

    return (
      <div className="stats-grid">
        <div className="stat-card">
          <div className="value">{asteroids.length}</div>
          <div className="label">Total Asteroids</div>
        </div>
        <div className="stat-card">
          <div className="value" style={{color:'#f87171'}}>{hazardousCount}</div>
          <div className="label">Hazardous</div>
        </div>
        <div className="stat-card">
          <div className="value" style={{color:'#34d399'}}>{closestDistance}K</div>
          <div className="label">Closest (km)</div>
        </div>
        <div className="stat-card">
          <div className="value" style={{color:'#60a5fa'}}>{asteroids.length - hazardousCount}</div>
          <div className="label">Safe</div>
        </div>
      </div>
    );
  };

  const filteredAsteroids = getFilteredAndSortedAsteroids();
  const closestAsteroid = findClosestAsteroid(filteredAsteroids);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>🌌 NASA Asteroid Dashboard</h1>
        <p>Near-Earth Objects Tracking System</p>
      </div>

      {/* Controls */}
      <div className="controls-container">
        <div>
          <label>Time Range</label>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="today">Today</option>
            <option value="week">This Week</option>
          </select>
        </div>

        <div>
          <label>Filter</label>
          <select value={filterHazardous} onChange={(e) => setFilterHazardous(e.target.value)}>
            <option value="all">All Asteroids</option>
            <option value="hazardous">Hazardous Only</option>
            <option value="safe">Safe Only</option>
          </select>
        </div>

        <div>
          <label>Sort By</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date">Closest Approach Date</option>
            <option value="distance">Distance (Nearest)</option>
            <option value="speed">Speed (Fastest)</option>
            <option value="size">Size (Largest)</option>
          </select>
        </div>

        <div>
          <label>Search by Asteroid ID</label>
          <div style={{display:'flex', gap:'8px'}}>
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchAsteroid()}
              placeholder="e.g., 3542519"
            />
            <button onClick={searchAsteroid}>Search</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {!loading && asteroids.length > 0 && <Stats />}

      {/* Search Result */}
      {searchResult && (
        <div>
          <h2>🔍 Search Result</h2>
          <div className="asteroid-grid">
            <AsteroidCard asteroid={searchResult} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{background:'#7f1d1d', padding:'16px', borderRadius:'12px', margin:'16px 0', border:'2px solid #f87171', display:'flex', gap:'8px'}}>
          <AlertCircle size={24}/>
          <div>
            <strong>Error:</strong> {error}
            <p>If using DEMO_KEY, you may have hit the rate limit. Try again in a few minutes or get your own API key.</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{textAlign:'center', padding:'80px 0'}}>
          <div style={{fontSize:'64px'}}>🛸</div>
          <div style={{color:'#ccc', fontSize:'24px'}}>Loading asteroid data...</div>
        </div>
      )}

      {/* Asteroids Grid */}
      {!loading && filteredAsteroids.length > 0 && (
        <div>
          <h2>{dateRange === 'today' ? "Today's Asteroids" : "This Week's Asteroids"}</h2>
          <div className="asteroid-grid">
            {filteredAsteroids.map((asteroid) => (
              <AsteroidCard
                key={asteroid.id}
                asteroid={asteroid}
                isClosest={closestAsteroid && asteroid.id === closestAsteroid.id}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && filteredAsteroids.length === 0 && !error && (
        <div style={{textAlign:'center', padding:'80px 0', color:'#ccc', fontSize:'20px'}}>
          No asteroids match your filters
        </div>
      )}
    </div>
  );
};

export default AsteroidDashboard;

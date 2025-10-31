import { useState, useEffect } from 'react';
import { useSessionToken } from '../hooks/useSessionToken';
import apiClient from '../api/client';

export default function Build() {
  const { token } = useSessionToken();
  const [projectType, setProjectType] = useState('website');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState('');
  const [products, setProducts] = useState('');
  const [style, setStyle] = useState('modern');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000); // تحديث كل 5 ثوان
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await apiClient.get('/api/factory/jobs');
      if (res.data.ok) {
        setJobs(res.data.jobs);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = {
        sessionToken: token,
        projectType,
        shortDescription: description,
        title,
        style
      };

      if (projectType === 'webapp' && features) {
        payload.features = features.split('\n').filter(f => f.trim());
      }

      if (projectType === 'ecommerce' && products) {
        payload.products = products.split('\n').filter(p => p.trim());
      }

      const res = await apiClient.post('/api/factory/build-new', payload);

      if (res.data.ok) {
        setSuccess(`Project queued successfully! Job ID: ${res.data.jobId}`);
        setTitle('');
        setDescription('');
        setFeatures('');
        setProducts('');
        fetchJobs();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'QUEUED': return 'text-yellow-400';
      case 'WORKING': return 'text-blue-400';
      case 'DONE': return 'text-green-400';
      case 'FAILED': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'QUEUED': return '⏳';
      case 'WORKING': return '⚙️';
      case 'DONE': return '✅';
      case 'FAILED': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Build New Project</h1>
        <p className="text-textDim">
          Create websites, web apps, or e-commerce stores using AI
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Project Details</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/50 rounded text-green-400 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-textDim mb-2">
                Project Type
              </label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="input-field w-full"
                disabled={loading}
              >
                <option value="website">Website / Landing Page</option>
                <option value="webapp">Web Application</option>
                <option value="ecommerce">E-commerce Store</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-textDim mb-2">
                Project Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field w-full"
                placeholder="My Awesome Project"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-textDim mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field w-full"
                rows={4}
                placeholder="Describe your project in detail..."
                required
                disabled={loading}
              />
              <p className="mt-1 text-xs text-textDim">
                Be specific! Example: "A modern landing page for a coffee shop with menu, location, and contact form"
              </p>
            </div>

            {projectType === 'website' && (
              <div>
                <label className="block text-sm font-medium text-textDim mb-2">
                  Style
                </label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="input-field w-full"
                  disabled={loading}
                >
                  <option value="modern">Modern</option>
                  <option value="minimal">Minimal</option>
                  <option value="creative">Creative</option>
                  <option value="professional">Professional</option>
                  <option value="playful">Playful</option>
                </select>
              </div>
            )}

            {projectType === 'webapp' && (
              <div>
                <label className="block text-sm font-medium text-textDim mb-2">
                  Features (one per line)
                </label>
                <textarea
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  className="input-field w-full"
                  rows={4}
                  placeholder="User authentication&#10;Dashboard&#10;Data visualization&#10;Real-time updates"
                  disabled={loading}
                />
              </div>
            )}

            {projectType === 'ecommerce' && (
              <div>
                <label className="block text-sm font-medium text-textDim mb-2">
                  Initial Products (one per line)
                </label>
                <textarea
                  value={products}
                  onChange={(e) => setProducts(e.target.value)}
                  className="input-field w-full"
                  rows={4}
                  placeholder="Coffee Beans - Premium Arabica&#10;Espresso Machine - Professional Grade&#10;Coffee Mug - Ceramic"
                  disabled={loading}
                />
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? '🚀 Creating Project...' : '🎨 Build with AI'}
            </button>
          </form>
        </div>

        {/* Recent Jobs */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Recent Projects</h2>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {jobs.length === 0 ? (
              <p className="text-textDim text-center py-8">
                No projects yet. Create your first one!
              </p>
            ) : (
              jobs.map((job) => (
                <div
                  key={job._id}
                  className="p-4 bg-bgLight rounded-lg border border-borderDim hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getStatusIcon(job.status)}</span>
                        <span className={`font-semibold ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </div>
                      <h3 className="font-medium">{job.title || job.projectType}</h3>
                      <p className="text-sm text-textDim line-clamp-2">
                        {job.shortDescription}
                      </p>
                    </div>
                  </div>

                  {job.progress !== undefined && job.status === 'WORKING' && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-textDim mb-1">
                        <span>{job.currentStep || 'Processing...'}</span>
                        <span>{job.progress}%</span>
                      </div>
                      <div className="w-full bg-bgDark rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-500"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {job.deploymentUrl && (
                    <div className="mt-3 pt-3 border-t border-borderDim">
                      <a
                        href={job.deploymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm flex items-center gap-1"
                      >
                        🌐 View Live Site
                        <span className="text-xs">↗</span>
                      </a>
                    </div>
                  )}

                  {job.error && (
                    <div className="mt-2 p-2 bg-red-500/10 rounded text-red-400 text-xs">
                      Error: {job.error}
                    </div>
                  )}

                  <div className="mt-2 text-xs text-textDim">
                    Created: {new Date(job.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

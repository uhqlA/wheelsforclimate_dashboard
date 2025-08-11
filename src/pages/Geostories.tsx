import { useState, useEffect, useCallback } from 'react';

// Simple SVG icon components (no external dependencies)
const SearchIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>
);

const FilterIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"></polygon>
  </svg>
);

const GridIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="3" width="7" height="7"></rect>
    <rect x="14" y="3" width="7" height="7"></rect>
    <rect x="14" y="14" width="7" height="7"></rect>
    <rect x="3" y="14" width="7" height="7"></rect>
  </svg>
);

const ListIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line>
    <line x1="3" y1="18" x2="3.01" y2="18"></line>
  </svg>
);

const ChevronLeftIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="15,18 9,12 15,6"></polyline>
  </svg>
);

const ChevronRightIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="9,18 15,12 9,6"></polyline>
  </svg>
);

const FileIcon = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"></path>
  </svg>
);

const UserIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const MapPinIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const AlertCircleIcon = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const RefreshIcon = ({ spinning }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={spinning ? 'animate-spin' : ''}
  >
    <polyline points="23,4 23,10 17,10"></polyline>
    <polyline points="1,20 1,14 7,14"></polyline>
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
  </svg>
);

// API Service
const API_BASE_URL = 'http://localhost:8000/api';

const apiService = {
  async getGeoStories(params = {}) {
    const searchParams = new URLSearchParams();

    Object.keys(params).forEach((key) => {
      if (
        params[key] !== null &&
        params[key] !== undefined &&
        params[key] !== ''
      ) {
        searchParams.append(key, params[key]);
      }
    });

    const queryString = searchParams.toString();
    const endpoint = `/geostories/${queryString ? '?' + queryString : ''}`;

    const response = await fetch(`${API_BASE_URL}${endpoint}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },
};

const GeoStoriesDashboard = () => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    totalPages: 1,
  });
  const [viewMode, setViewMode] = useState('grid');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    location: '',
    author: '',
  });

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch stories when debounced search term or page changes
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) return;
    fetchStories();
  }, [debouncedSearchTerm, currentPage, filters]);

  const fetchStories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
      };

      if (debouncedSearchTerm.trim()) {
        params.search = debouncedSearchTerm.trim();
      }

      if (filters.location) {
        params.location_name = filters.location;
      }

      if (filters.author) {
        params.author_email = filters.author;
      }

      const response = await apiService.getGeoStories(params);

      setStories(response.results || []);

      const count = response.count || 0;
      const pageSize = 12;
      const totalPages = Math.ceil(count / pageSize);

      setPagination({
        count,
        next: response.next,
        previous: response.previous,
        totalPages,
      });
    } catch (err) {
      console.error('Error fetching stories:', err);

      let errorMessage = 'Failed to fetch stories.';
      if (err.message.includes('Failed to fetch')) {
        errorMessage +=
          ' Please check if the Django server is running on http://localhost:8000';
      } else if (err.message.includes('500')) {
        errorMessage += ' Server error occurred.';
      } else if (err.message.includes('404')) {
        errorMessage += ' API endpoint not found.';
      }

      setError(errorMessage);
      setStories([]);
      setPagination({
        count: 0,
        next: null,
        previous: null,
        totalPages: 1,
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, filters]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      location: '',
      author: '',
    });
    setSearchTerm('');
    setCurrentPage(1);
  };

  const StoryCard = ({ story }) => {
    const formatDate = (dateString) => {
      try {
        return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      } catch (error) {
        return 'Invalid date';
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
        <div
          className="aspect-video bg-gray-100 flex items-center justify-center relative"
          style={{ aspectRatio: '16/9' }}
        >
          {story.thumbnail_url ? (
            <img
              src={story.thumbnail_url}
              alt={story.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className={`flex flex-col items-center text-gray-400 ${
              story.thumbnail_url ? 'hidden' : ''
            }`}
          >
            <FileIcon />
            <span className="text-sm mt-2">No Preview</span>
          </div>
          <div className="absolute top-2 left-2">
            <div className="bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
              PDF
            </div>
          </div>
        </div>

        <div className="p-4">
          <h3
            className="font-semibold text-gray-900 mb-2 text-sm leading-tight overflow-hidden"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
            title={story.title}
          >
            {story.title}
          </h3>

          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex items-center">
              <UserIcon />
              <span className="truncate ml-1">{story.author_email}</span>
            </div>

            {story.location_name && (
              <div className="flex items-center">
                <MapPinIcon />
                <span className="truncate ml-1">{story.location_name}</span>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
            <span className="text-xs text-gray-500">
              {formatDate(story.created_at)}
            </span>

            {story.pdf_url && (
              <a
                href={story.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-xs font-medium"
              >
                View PDF
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  const Pagination = () => {
    if (pagination.totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages = [];
      const maxVisiblePages = 5;

      if (pagination.totalPages <= maxVisiblePages) {
        for (let i = 1; i <= pagination.totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (currentPage <= 3) {
          for (let i = 1; i <= 4; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(pagination.totalPages);
        } else if (currentPage >= pagination.totalPages - 2) {
          pages.push(1);
          pages.push('...');
          for (
            let i = pagination.totalPages - 3;
            i <= pagination.totalPages;
            i++
          ) {
            pages.push(i);
          }
        } else {
          pages.push(1);
          pages.push('...');
          for (let i = currentPage - 1; i <= currentPage + 1; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(pagination.totalPages);
        }
      }

      return pages;
    };

    return (
      <div className="flex items-center justify-center space-x-2 mt-8">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          <ChevronLeftIcon />
        </button>

        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                ...
              </span>
            );
          }

          return (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                currentPage === page
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          );
        })}

        <button
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, pagination.totalPages))
          }
          disabled={currentPage === pagination.totalPages}
          className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          <ChevronRightIcon />
        </button>
      </div>
    );
  };

  const FilterPanel = () => {
    if (!filterOpen) return null;

    return (
      <div className="bg-gray-50 border-t border-gray-200 p-4 mt-4 rounded-b-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              placeholder="Filter by location..."
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Author Email
            </label>
            <input
              type="text"
              placeholder="Filter by author..."
              value={filters.author}
              onChange={(e) => handleFilterChange('author', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>
    );
  };

  const LoadingSpinner = () => (
    <div className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 12a9 9 0 11-6.219-8.56" />
      </svg>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Wheels For Climate GeoStories
          </h1>
          <p className="text-gray-600">
            Discover and explore geographic stories from around the world
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <SearchIcon />
                  </div>
                  <input
                    type="text"
                    placeholder="Search stories, locations, or authors..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={() => setFilterOpen(!filterOpen)}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-md transition-colors ${
                    filterOpen
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <FilterIcon />
                  <span>Filter</span>
                </button>

                <button
                  onClick={() => fetchStories()}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  title="Refresh stories"
                >
                  <RefreshIcon spinning={loading} />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 mr-2">
                  {pagination.count > 0
                    ? `${pagination.count} Resources found`
                    : 'No resources found'}
                </span>

                <div className="flex border border-gray-300 rounded-md overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${
                      viewMode === 'grid'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    title="Grid view"
                  >
                    <GridIcon />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${
                      viewMode === 'list'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    title="List view"
                  >
                    <ListIcon />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <FilterPanel />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <LoadingSpinner />
              <p className="text-gray-600">Loading stories...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-500 mx-auto mb-4">
              <AlertCircleIcon />
            </div>
            <h3 className="text-lg font-medium text-red-900 mb-2">
              No Stories found
            </h3>
            {/* <p className="text-red-700 mb-4">{error}</p> */}
            <button
              onClick={() => fetchStories()}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mx-auto mb-4">
              <FileIcon />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No stories found
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filters.location || filters.author
                ? 'Try adjusting your search criteria or filters'
                : 'No stories have been uploaded yet'}
            </p>
            {(searchTerm || filters.location || filters.author) && (
              <button
                onClick={clearFilters}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div
              className={`grid ${
                viewMode === 'grid'
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                  : 'grid-cols-1 gap-4'
              }`}
            >
              {stories.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>

            <Pagination />
          </>
        )}
      </div>
    </div>
  );
};

export default GeoStoriesDashboard;

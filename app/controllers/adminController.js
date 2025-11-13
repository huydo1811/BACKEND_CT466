import mongoose from 'mongoose'
import Movie from '../models/Movie.js'
import Episode from '../models/Episode.js'
import User from '../models/User.js'
import Review from '../models/Review.js'

export const getDashboardStats = async (req, res) => {
  try {
    const year = new Date().getFullYear() // always use current year

    // totals
    const totalMovies = await Movie.countDocuments({})
    const totalUsers = await User.countDocuments({})
    const totalEpisodes = await Episode.countDocuments({})

    // aggregate total views (movies + episodes)
    const movieViewsAgg = await Movie.aggregate([
      { $group: { _id: null, total: { $sum: { $ifNull: ['$viewCount', 0] } } } }
    ])
    const episodeViewsAgg = await Episode.aggregate([
      { $group: { _id: null, total: { $sum: { $ifNull: ['$viewCount', 0] } } } }
    ])
    const totalViews = (movieViewsAgg[0]?.total || 0) + (episodeViewsAgg[0]?.total || 0)

    // monthly arrays for current year (1..12)
    const months = Array.from({ length: 12 }, (_, i) => i + 1)
    const monthLabels = months.map(m => `Thg ${m}`)

    // helper to bucket counts by month using createdAt
    const buildMonthlyCount = async (Model, dateField = 'createdAt') => {
      const agg = await Model.aggregate([
        {
          $match: {
            [dateField]: {
              $gte: new Date(`${year}-01-01T00:00:00.000Z`),
              $lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
            }
          }
        },
        {
          $group: {
            _id: { $month: `$${dateField}` },
            count: { $sum: 1 }
          }
        }
      ])
      const map = new Map(agg.map(a => [a._id, a.count]))
      return months.map(m => map.get(m) || 0)
    }

    // movies / users / episodes per month
    const monthlyMovies = await buildMonthlyCount(Movie)
    const monthlyUsers = await buildMonthlyCount(User)
    const monthlyEpisodes = await buildMonthlyCount(Episode)

    // monthlyViews: sum viewCount of movies/episodes created in that month
    const movieViewsByMonthAgg = await Movie.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${year}-01-01T00:00:00.000Z`),
            $lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          views: { $sum: { $ifNull: ['$viewCount', 0] } }
        }
      }
    ])
    const episodeViewsByMonthAgg = await Episode.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${year}-01-01T00:00:00.000Z`),
            $lt: new Date(`${year + 1}-01-01T00:00:00.000Z`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          views: { $sum: { $ifNull: ['$viewCount', 0] } }
        }
      }
    ])
    const mvMap = new Map(movieViewsByMonthAgg.map(a => [a._id, a.views]))
    const evMap = new Map(episodeViewsByMonthAgg.map(a => [a._id, a.views]))
    const monthlyViews = months.map(m => (mvMap.get(m) || 0) + (evMap.get(m) || 0))

    // comparison: current month vs previous month
    const now = new Date()
    const curMonth = now.getMonth() + 1 // 1..12
    const prevMonth = curMonth > 1 ? curMonth - 1 : 12

    const safeChange = (arr) => {
      const cur = arr[curMonth - 1] || 0
      const prev = arr[prevMonth - 1] || 0
      const diff = cur - prev
      const pct = prev === 0 ? (cur === 0 ? 0 : 100) : Math.round((diff / prev) * 100)
      return { cur, prev, diff, pct }
    }

    const viewsCompare = safeChange(monthlyViews)
    const moviesCompare = safeChange(monthlyMovies)
    const usersCompare = safeChange(monthlyUsers)
    const episodesCompare = safeChange(monthlyEpisodes)

    // recent activities within last 24 hours
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [recentMovies, recentUsers, recentEpisodes, recentReviews] = await Promise.all([
      Movie.find({ createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(10).select('title createdAt').lean(),
      User.find({ createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(10).select('fullName username createdAt').lean(),
      Episode.find({ createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(10).select('title movie createdAt').lean(),
      Review.find({ createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(10).select('comment rating movie user createdAt').lean()
    ])

    const activities = []
    recentMovies.forEach(m => activities.push({ id: `movie-${m._id}`, type: 'movie', text: `Phim mới: ${m.title}`, time: m.createdAt }))
    recentUsers.forEach(u => activities.push({ id: `user-${u._id}`, type: 'user', text: `Người dùng mới: ${u.fullName || u.username}`, time: u.createdAt }))
    recentEpisodes.forEach(e => activities.push({ id: `episode-${e._id}`, type: 'episode', text: `Tập phim mới: ${e.title}`, time: e.createdAt }))
    recentReviews.forEach(r => activities.push({ id: `review-${r._id}`, type: 'review', text: `Đánh giá mới (${r.rating}/5)`, time: r.createdAt }))

    activities.sort((a, b) => new Date(b.time) - new Date(a.time))
    const recentActivities = activities.slice(0, 10)

    res.json({
      success: true,
      data: {
        totalMovies,
        totalUsers,
        totalEpisodes,
        totalViews,
        monthlyLabels: monthLabels,
        monthlyViews,
        monthlyUsers,
        monthlyMovies,
        monthlyEpisodes,
        compare: {
          views: viewsCompare,
          movies: moviesCompare,
          users: usersCompare,
          episodes: episodesCompare
        },
        recentActivities
      }
    })
  } catch (err) {
    console.error('getDashboardStats error', err)
    res.status(500).json({ success: false, message: 'Lỗi lấy số liệu dashboard' })
  }
}
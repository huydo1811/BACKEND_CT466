import fs from 'fs'
import path from 'path'
import Episode from '../models/Episode.js'
import Movie from '../models/Movie.js'

const uploadsDir = path.join(process.cwd(), 'uploads', 'episodes')

// helper: delete local file if url points to /uploads/episodes/<filename>
const _deleteLocalFile = (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== 'string') return
  try {
    const segment = '/uploads/episodes/'
    const idx = fileUrl.indexOf(segment)
    if (idx === -1) return
    const filename = fileUrl.slice(idx + segment.length)
    const fp = path.join(uploadsDir, filename)
    if (fs.existsSync(fp)) fs.unlinkSync(fp)
  } catch (err) {
    console.warn('delete local episode file error', err)
  }
}

class EpisodeService {
  
  // Lấy episodes của một series
  async getEpisodesByMovie(movieId, season = null) {
    try {
      let query = { movie: movieId, isPublished: true };
      if (season) query.season = season;
      
      const episodes = await Episode.find(query)
        .populate('movie', 'title')
        .sort({ season: 1, episodeNumber: 1 });
      
      return episodes;
    } catch (error) {
      throw new Error(`Lỗi khi lấy episodes: ${error.message}`);
    }
  }
  
  // Lấy episode theo slug
  async getEpisodeBySlug(slug) {
    try {
      const episode = await Episode.findOne({ slug, isPublished: true })
        .populate('movie', 'title poster categories');
      
      if (!episode) {
        throw new Error('Episode không tồn tại');
      }
      
      return episode;
    } catch (error) {
      throw new Error(`Lỗi khi lấy episode: ${error.message}`);
    }
  }
  
  // Lấy episode theo ID
  async getEpisodeById(id) {
    try {
      const episode = await Episode.findById(id).populate('movie');
      if (!episode) {
        throw new Error('Episode không tồn tại');
      }
      return episode;
    } catch (error) {
      throw new Error(`Lỗi khi lấy episode: ${error.message}`);
    }
  }
  
  // Tạo episode mới
  async createEpisode(episodeData, userId) {
    try {
      // Kiểm tra movie tồn tại
      const movie = await Movie.findById(episodeData.movie);
      if (!movie) {
        throw new Error('Movie/Series không tồn tại');
      }
      
      // Kiểm tra episode đã tồn tại chưa
      const existingEpisode = await Episode.findOne({
        movie: episodeData.movie,
        season: episodeData.season,
        episodeNumber: episodeData.episodeNumber
      });
      
      if (existingEpisode) {
        throw new Error(`Episode S${episodeData.season}E${episodeData.episodeNumber} đã tồn tại`);
      }
      
      episodeData.createdBy = userId;
      const episode = await Episode.create(episodeData);
      
      return await this.getEpisodeById(episode._id);
    } catch (error) {
      throw new Error(`Lỗi khi tạo episode: ${error.message}`);
    }
  }
  
  // Cập nhật episode
  async updateEpisode(id, episodeData, userId) {
    try {
      // find existing to check old files
      const existing = await Episode.findById(id).lean()
      if (!existing) throw new Error('Episode không tồn tại')

      // if thumbnail replaced, remove old file
      if (episodeData.thumbnail && existing.thumbnail && episodeData.thumbnail !== existing.thumbnail) {
        _deleteLocalFile(existing.thumbnail)
      }
      // if video replaced, remove old file
      if (episodeData.videoUrl && existing.videoUrl && episodeData.videoUrl !== existing.videoUrl) {
        _deleteLocalFile(existing.videoUrl)
      }

      const episode = await Episode.findByIdAndUpdate(
        id,
        episodeData,
        { new: true, runValidators: true }
      ).populate('movie');

      if (!episode) {
        throw new Error('Episode không tồn tại');
      }

      return episode;
    } catch (error) {
      throw new Error(`Lỗi khi cập nhật episode: ${error.message}`);
    }
  }

  // Xóa episode
  async deleteEpisode(id) {
    try {
      const episode = await Episode.findByIdAndDelete(id);
      if (!episode) {
        throw new Error('Episode không tồn tại');
      }
      // delete thumbnail & video files if stored locally
      if (episode.thumbnail) _deleteLocalFile(episode.thumbnail)
      if (episode.videoUrl) _deleteLocalFile(episode.videoUrl)

      return episode;
    } catch (error) {
      throw new Error(`Lỗi khi xóa episode: ${error.message}`);
    }
  }
  
  // Tăng view count
  async incrementView(id) {
    try {
      const episode = await Episode.findByIdAndUpdate(
        id,
        { $inc: { viewCount: 1 } },
        { new: true }
      );
      
      if (!episode) {
        throw new Error('Episode không tồn tại');
      }
      
      return episode;
    } catch (error) {
      throw new Error(`Lỗi khi tăng view count: ${error.message}`);
    }
  }
  
  // Lấy episodes theo điều kiện admin
  async getAdminEpisodes({ page = 1, limit = 20, search, movie, season, isPublished }) {
    const query = {}
    if (movie) query.movie = movie
    if (season !== undefined && season !== '') query.season = Number(season)
    if (isPublished === 'true' || isPublished === 'false') query.isPublished = isPublished === 'true'
    if (search) query.title = { $regex: search, $options: 'i' }

    const skip = (Number(page) - 1) * Number(limit)
    const [episodes, totalItems] = await Promise.all([
      Episode.find(query)
        .populate('movie', 'title')
        .sort({ 'movie': 1, season: 1, episodeNumber: 1 })
        .skip(skip).limit(Number(limit)).lean(),
      Episode.countDocuments(query)
    ])

    const totalPages = Math.max(1, Math.ceil(totalItems / Number(limit)))
    return {
      episodes,
      pagination: { currentPage: Number(page), totalPages, totalItems, itemsPerPage: Number(limit) }
    }
  }
}

export default new EpisodeService();
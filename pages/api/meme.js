// API route to fetch memes from Reddit
export default async function handler(req, res) {
  const { genre = 'memes', nsfw = 'false' } = req.query;
  
  try {
    const subreddit = genre || 'memes';
    const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=100`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch memes');
    }
    
    const data = await response.json();
    const posts = data.data.children;
    
    // Filter for image posts
    let images = posts.filter(post => {
      const url = post.data.url;
      return url && (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.gif') || url.includes('i.redd.it'));
    });
    
    // Filter NSFW if requested
    if (nsfw === 'false') {
      images = images.filter(post => !post.data.over_18);
    }
    
    if (images.length === 0) {
      return res.status(404).json({ 
        error: 'No memes found. Even the internet is taking a break! 🤷‍♂️',
        fallback: true 
      });
    }
    
    // Return random meme
    const randomPost = images[Math.floor(Math.random() * images.length)];
    
    res.status(200).json({
      url: randomPost.data.url,
      title: randomPost.data.title,
      author: randomPost.data.author,
      subreddit: randomPost.data.subreddit,
      nsfw: randomPost.data.over_18,
      ups: randomPost.data.ups,
      permalink: `https://reddit.com${randomPost.data.permalink}`
    });
  } catch (error) {
    console.error('Meme fetch error:', error);
    res.status(500).json({ 
      error: 'Oops! The meme machine broke. Try turning it off and on again. 🔧',
      fallback: true 
    });
  }
}

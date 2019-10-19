const testBookmarks = [
    {
        id: 1,
        title: 'Bookmark one',
        url: 'this.com',
        rating: 4,
        description: 'this is a bookmark'
    },
    {
        id: 2,
        title: 'Bookmark two',
        url: 'that.com',
        rating:5,
        description: 'this is a bookmark'
    },
    {
        id: 3,
        title: 'Bookmark three',
        url: 'what.com',
        rating: 3,
        description: 'this is a bookmark'
    },
    {
        id: 4,
        title: 'Bookmark four',
        url: 'why.com',
        rating:5,
        description: 'this is a bookmark'
    }
]


function makeMaliciousBookmark() {
    const maliciousBookmark = {
      id: 911,
      rating: 5,
      url: 'virus.com',
      title: 'Naughty naughty very naughty <script>alert("xss");</script>',
      description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`
    }
    const expectedBookmark = {
      ...maliciousBookmark,
      title: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
      description: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
    }
    return {
      maliciousBookmark,
      expectedBookmark,
    }
  }
module.exports = {testBookmarks, makeMaliciousBookmark};
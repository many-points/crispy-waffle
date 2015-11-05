Posts = new Mongo.Collection('posts');

Posts.allow({
  update: ownsDocument,
  remove: ownsDocument
});

Posts.deny({
  update: function(userId, post, fieldNames) {
    return _.without(fieldNames, 'url', 'title').length > 0;
  }
});

Meteor.methods({
  postInsert: function(postAttributes) {
    check(Meteor.userId(), String);
    check(postAttributes, {
      title: String,
      url: String
    });

    var postWithSameLink = Posts.findOne({url: postAttributes.url});
    if (postAttributes.url && postWithSameLink) {
      raiseError('Post with this url already exists.')
      return {
        postExists: true,
        _id: postWithSameLink._id
      };
    }

    var user = Meteor.user();
    var post = _.extend(_.pick(postAttributes, 'url', 'title'), {
      userId: user._id,
      author: user.username,
      submitted: new Date().getTime(),
      commentsCount: 0,
      upvoters: [],
      votes: 0
    });

    var postId = Posts.insert(post);

    return {
      _id: postId
    };
  },
  upvote: function(postId) {
    var user = Meteor.user();

    if (!user) {
      throw new Meteor.Error(401, "You need to log in to do that.");
    }

    var post = Posts.findOne(postId);

    if (!post) {
      throw new Meteor.Error(422, "Post doesn't exist.");
    }

    if (_.include(post.upvoters, user._id)) {
      throw new Meteor.Error(422, "You already voted for this.");
    }

    Posts.update(post._id, {
      $addToSet: {upvoters: user._id},
      $inc: {votes: 1}
    });
  }
});
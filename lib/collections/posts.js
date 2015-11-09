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
      voters: [],
      votes: 0
    });

    var postId = Posts.insert(post);

    return {
      _id: postId
    };
  },

  upvote: function(postId) {
    check(postId, String);

    var user = Meteor.user();

    if (!user) {
      throw new Meteor.Error(401, "You need to log in to do that.");
    }

    Posts.update({
      _id: postId,
      voters: {$ne: user._id}
    }, {
      $addToSet: {voters: user._id},
      $inc: {votes: 1}
    });
  },

  downvote: function(postId) {
    check(postId, String);

    var user = Meteor.user();

    if (!user) {
      throw new Meteor.Error(401, "You need to log in to do that.");
    }

    Posts.update({
      _id: postId,
      voters: {$ne: user._id}
    }, {
      $addToSet: {voters: user._id},
      $inc: {votes: -1}
    })
  }
});
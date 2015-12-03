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
      upvoters: [],
      downvoters: [],
      upvotes: 0,
      downvotes: 0
    });

    var postId = Posts.insert(post);

    return {
      _id: postId
    };
  },

  vote: function(postId, action) {
    check(postId, String);
    check(action, String);

    var user = Meteor.user();

    if (!user) {
      throw new Meteor.Error(401, "You need to log in to do that.");
    }

    if (action !== "upvote" && action !== "downvote") {
      throw new Meteor.Error(401, "Incorrect action.");
    }

    var post = Posts.findOne({_id: postId});

    if (action === "upvote") {

      if (_.contains(post.upvoters, user._id)) {
        throw new Meteor.Error(401, "You've already upvoted this.");
      }

      if (_.contains(post.downvoters, user._id)) {
        Posts.update(postId, {
          $addToSet: {upvoters: user._id},
          $pull: {downvoters: user._id},
          $inc: {votes: 2}
        });
      } else {
        Posts.update(postId, {
          $addToSet: {upvoters: user._id},
          $inc: {votes: 1}
        });
      }

    } else if (action === "downvote") {

      if (_.contains(post.downvoters, user._id)) {
        throw new Meteor.Error(401, "You've already downvoted this.");
      }

      if (_.contains(post.upvoters, user._id)) {
        Posts.update(postId, {
          $addToSet: {downvoters: user._id},
          $pull: {upvoters: user._id},
          $inc: {votes: -2}
        });
      } else {
        Posts.update(postId, {
          $addToSet: {downvoters: user._id},
          $inc: {votes: -1}
        });
      }

    }

  }
});

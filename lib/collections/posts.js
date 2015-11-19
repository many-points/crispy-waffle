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

  upvote: function(postId) {
    check(postId, String);

    var user = Meteor.user();

    if (!user) {
      throw new Meteor.Error(401, "You need to log in to do that.");
    }

    var post = Posts.findOne({_id: postId});
    var downvoter = post.downvoters.indexOf(user._id) != -1 ? true : false;

    if (downvoter) {
      Posts.update({
        _id: postId,
        upvoters: {$ne: user._id}
      }, {
        $addToSet: {upvoters: user._id},
        $pull: {downvoters: user._id},
        $inc: {upvotes: 1, downvotes: -1},
      })
    } else {
      Posts.update({
        _id: postId,
        upvoters: {$ne: user._id}
      }, {
        $addToSet: {upvoters: user._id},
        $inc: {upvotes: 1},
      });
    }
  },

  downvote: function(postId) {
    check(postId, String);

    var user = Meteor.user();

    if (!user) {
      throw new Meteor.Error(401, "You need to log in to do that.");
    }

    var post = Posts.findOne({_id: postId});
    var upvoter = post.upvoters.indexOf(user._id) != -1 ? true : false;

    if (upvoter) {
      Posts.update({
        _id: postId,
        downvoters: {$ne: user._id}
      }, {
        $addToSet: {downvoters: user._id},
        $pull: {upvoters: user._id},
        $inc: {downvotes: 1, upvotes: -1},
      })
    } else {
      Posts.update({
        _id: postId,
        downvoters: {$ne: user._id}
      }, {
        $addToSet: {downvoters: user._id},
        $inc: {downvotes: 1}
      });
    }
  },

  vote: function(postId, action) { // T_T
    check(postId, String);
    check(action, Boolean);

    var user = Meteor.user();

    if (!user) {
      throw new Meteor.Error(401, "You need to log in to do that.");
    }

    var voters = action ? 'upvoters' : 'downvoters';
    var votes = action ? 'upvotes' : 'downvotes';

    var post = Posts.findOne({_id: postId});
    var voterAlready = post[action ? 'downvoters' : 'upvoters'].indexOf(user._id) != -1;

    var query = {};
    query[voters] = {$ne: user._id};
    query['_id'] = postId;

    var update = {$addToSet: {}, $inc: {}};
    update.$addToSet[voters] = user._id;
    update.$inc[votes] = 1;

    if (voterAlready) {
      update = _.extend(update, {$pull: {}})
      update.$inc[action ? 'downvotes' : 'upvotes'] = -1;
      update.$pull[action ? 'downvoters' : 'upvoters'] = user._id;
    }

    Posts.update(query,update);
  }
});

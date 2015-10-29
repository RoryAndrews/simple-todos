Tasks = new Mongo.Collection("tasks");

if (Meteor.isServer) {
  // This code only runs on the server
  // Only publish tasks that are public or belong to the current user
  /**
   * Publishes tasks that are public or belong to the current user.
   */
  Meteor.publish("tasks", function () {
    return Tasks.find({
      $or: [
        { private: {$ne: true} },
        { owner: this.userId }
      ]
    });
  });
}

if (Meteor.isClient) {
  // This code only runs on the client
  Meteor.subscribe("tasks");

  Template.body.helpers({
    /**
     * Returns tasks for the user. Doesn't display completed tasks if hideCompleted is checked.
     * @returns {*|Mongo.Cursor} The tasks.
     */
    tasks: function () {
      if (Session.get("hideCompleted")) {
        // If hide completed is checked, filter tasks
        return Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}});
      } else {
        // Otherwise, return all of the tasks
        return Tasks.find({}, {sort: {createdAt: -1}});
      }
    },
    /**
     * Returns true if hideCompleted is checked.
     * @returns {boolean}
     */
    hideCompleted: function () {
      return Session.get("hideCompleted");
    },
    /**
     * Returns the amount of tasks that are incomplete.
     * @returns {*|1059|Number} The number of incomplete tasks.
     */
    incompleteCount: function () {
      return Tasks.find({checked: {$ne: true}}).count();
    }
  });

  Template.body.events({
    /**
     * Creates and adds a new task.
     * @param event The browser event when user clicks to create a new task.
     */
    "submit .new-task": function (event) {
      // Prevent default browser form submit
      event.preventDefault();

      // Get value from form element
      var text = event.target.text.value;

      // Insert a task into the collection
      Meteor.call("addTask", text);

      // Clear form
      event.target.text.value = "";
    },
    /**
     * Changes the hideCompleted variable.
     * @param event The event whether the box is checked or unchecked by the user.
     */
    "change .hide-completed input": function (event) {
      Session.set("hideCompleted", event.target.checked);
    }
  });

  Template.task.helpers({
    /**
     * Returns true if the owner of the task is the current user.
     * @returns {boolean} True if it is owned by the current user.
     */
    isOwner: function () {
      return this.owner === Meteor.userId();
    }
  });

  Template.task.events({
    /**
     * Toggles the checked property.
     */
    "click .toggle-checked": function () {
      // Set the checked property to the opposite of its current value
      Meteor.call("setChecked", this._id, ! this.checked);
    },
    /**
     * Deletes the current task.
     */
    "click .delete": function () {
      Meteor.call("deleteTask", this._id);
    },
    /**
     * Toggles the private property of the current task.
     */
    "click .toggle-private": function () {
      Meteor.call("setPrivate", this._id, ! this.private);
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
}

Meteor.methods({
  /**
   * Adds a new task if the user is logged in.
   * @param text Name of the task.
   */
  addTask: function (text) {
    // Make sure the user is logged in before inserting a task
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
  /**
   * Deletes the task unless private and not owned by current user.
   * @param taskId Id of the current task.
   */
  deleteTask: function (taskId) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can delete it
      throw new Meteor.Error("not-authorized");
    }

    Tasks.remove(taskId);
  },
  /**
   * Set the checked state of a task unless private and not owned by current user.
   * @param taskId Id of task
   * @param setChecked The value setChecked should be set to.
   */
  setChecked: function (taskId, setChecked) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can check it off
      throw new Meteor.Error("not-authorized");
    }

    Tasks.update(taskId, { $set: { checked: setChecked} });
  },
  /**
   * Set the private state if task is owned by current user.
   * @param taskId Id of the task.
   * @param setToPrivate New value of the private state.
   */
  setPrivate: function (taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);

    // Make sure only the task owner can make a task private
    if (task.owner !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.update(taskId, { $set: { private: setToPrivate } });
  }
});
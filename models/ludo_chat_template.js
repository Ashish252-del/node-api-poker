'use strict';
module.exports = (sequelize, DataTypes) => {
  const chat_template = sequelize.define('chat_template', {
    title: DataTypes.STRING,
    status: DataTypes.INTEGER
  }, {
    tableName: 'ludo_chat_template',  // Explicitly set the table name
    freezeTableName: true
  });
  chat_template.associate = function(models) {
    // associations can be defined here
  };
  return chat_template;
};
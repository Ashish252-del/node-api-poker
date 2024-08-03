"use strict";
module.exports = (sequelize, DataTypes) => {
    const emojis = sequelize.define(
        "emojis",
        {
            unicode_text:  DataTypes.STRING,
            emojis: DataTypes.STRING,
        },
        {
            tableName: 'ludo_emojis',  // Explicitly set the table name
             freezeTableName: true }
    );
    return emojis;
};

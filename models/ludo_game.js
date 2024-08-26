module.exports = (sequelize, DataTypes) => {
    const ludo_games = sequelize.define(
      "ludo_games",
      { 
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: DataTypes.INTEGER
        },
        name: DataTypes.STRING,
        varient_id: DataTypes.INTEGER,
        type_id: DataTypes.INTEGER,
        status: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
        comission:{
          type: DataTypes.STRING
        },
        cap:{
          type: DataTypes.STRING
        },
        player_type:DataTypes.STRING,
        game_json_data:{ type: DataTypes.STRING, allowNull: true, defaultValue: 0 },
        private_table_id:{ type: DataTypes.STRING, allowNull: false, defaultValue: 0 },
        isPrivate:{ type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        added_by:DataTypes.STRING,
        total_game_time:DataTypes.STRING,
        game_prize_id: {type: DataTypes.INTEGER,allowNull: true,},
      },
      {
        tableName: 'ludo_games',  // Explicitly set the table name
        freezeTableName: true,
        timestamps: false,
      }
    );
    return ludo_games;
  };
  
const nodePath = require('path')

module.exports = {
    PORT: 3400,
    MOCK_DIR: nodePath.join(__dirname, '..', 'mockJson'),
    GROUP_DATA_PATH: nodePath.join(__dirname, '..', 'groupInfo', 'groupData.json'),
    UPLOAD_DIR: nodePath.join(__dirname, '..', 'uploads'),
    PUBLIC_DIR: nodePath.join(__dirname, '..', 'public'),
}
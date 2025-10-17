#!/bin/bash

# 生产环境打包脚本
# 将数据库初始化功能从 electron-main.js 分离到打包流程中

set -e  # 遇到错误立即退出

echo "🚀 开始生产环境打包流程..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 备份目录名称（带时间戳）
PRISMA_BACKUP_DIR="prisma_backup_$(date +%Y%m%d%H%M%S)"

# 备份 prisma 文件夹
backup_prisma() {
    print_message "备份 prisma 文件夹..."
    if [ -d "prisma" ]; then
        cp -R prisma "$PRISMA_BACKUP_DIR"
        print_success "已备份 prisma 到: $PRISMA_BACKUP_DIR"
    else
        print_warning "未找到 prisma 目录，跳过备份"
    fi
}

# 将备份的 prisma 覆盖回仓库原始位置（./prisma）
restore_prisma_to_repo() {
    print_message "将备份的 prisma 覆盖回项目原始位置..."
    if [ -d "$PRISMA_BACKUP_DIR" ]; then
        mkdir -p prisma
        # 清空原 prisma 目录（保留目录本身）
        find prisma -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null || true
        cp -R "$PRISMA_BACKUP_DIR/"* prisma/ 2>/dev/null || true
        print_success "已将备份的 prisma 覆盖回 ./prisma"
    else
        print_warning "未找到备份目录 $PRISMA_BACKUP_DIR，跳过覆盖回原位置"
    fi
}

# 检查必要的命令
check_commands() {
    print_message "检查必要的命令..."

    commands=("node" "npm" "npx")
    for cmd in "${commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            print_error "$cmd 命令未找到，请先安装 Node.js"
            exit 1
        fi
    done

    print_success "所有必要命令检查完成"
}

# 清理旧的构建文件
clean_build() {
    print_message "清理旧的构建文件..."

    if [ -d "dist" ]; then
        rm -rf dist
        print_success "清理 dist 目录完成"
    fi

    if [ -d "node_modules/.cache" ]; then
        rm -rf node_modules/.cache
        print_success "清理缓存目录完成"
    fi
}

# 生成 Prisma 客户端
generate_prisma() {
    print_message "生成 Prisma 客户端..."

    npx prisma generate
    print_success "Prisma 客户端生成完成"
}

# 初始化数据库
init_database() {
    print_message "初始化生产环境数据库..."

    # 创建数据库目录
    mkdir -p prisma

    # 运行数据库初始化脚本
    node build-production.js
    print_success "数据库初始化完成"
}

# 构建 Electron 应用
build_electron() {
    print_message "构建 Electron 应用..."

    # 根据操作系统选择构建命令
    case "$(uname -s)" in
        Darwin*)
            print_message "检测到 macOS，构建 macOS 版本..."
            npm run build-mac
            ;;
        Linux*)
            print_message "检测到 Linux，构建 Linux 版本..."
            npm run build-linux
            ;;
        CYGWIN*|MINGW32*|MSYS*|MINGW*)
            print_message "检测到 Windows，构建 Windows 版本..."
            npm run build-win
            ;;
        *)
            print_warning "未知操作系统，使用默认构建..."
            npm run build
            ;;
    esac

    print_success "Electron 应用构建完成"
}



# 验证构建结果
verify_build() {
    print_message "验证构建结果..."

    if [ -d "dist" ]; then
        print_success "构建目录 dist 已创建"

        # 列出构建产物
        echo "构建产物："
        ls -la dist/

        # 检查是否有 DMG 文件（macOS）
        if ls dist/*.dmg 1> /dev/null 2>&1; then
            print_success "找到 DMG 安装包"
        fi

        # 检查是否有 APP 文件（macOS）
        if ls dist/*.app 1> /dev/null 2>&1; then
            print_success "找到 APP 应用包"
        fi

    else
        print_error "构建目录 dist 未创建"
        exit 1
    fi
}

# 显示构建信息
show_build_info() {
    print_success "🎉 生产环境打包完成！"
    echo ""
    echo "📁 构建输出目录: dist/"
    echo "📦 应用已准备就绪"
    echo ""
    echo "🚀 下一步："
    echo "   1. 检查 dist/ 目录中的构建产物"
    echo "   2. 测试安装包功能"
    echo "   3. 分发给用户"
    echo ""
}

# 错误处理
handle_error() {
    print_error "构建过程中发生错误，正在恢复..."

    # 恢复原始文件
    if [ -f "electron-main.js.backup" ]; then
        mv electron-main.js.backup electron-main.js
        print_success "已恢复原始文件"
    fi

    exit 1
}

# 设置错误陷阱
trap handle_error ERR

# 主执行流程
main() {
    print_message "开始生产环境打包流程..."

    # 检查命令
    check_commands

    # 清理构建
    clean_build

    # 生成 Prisma 客户端
    generate_prisma

    # 备份 prisma（初始化数据库之前）
    backup_prisma

    # 初始化数据库
    init_database

    # 构建 Electron 应用
    build_electron

    # 使用备份覆盖回项目原始位置的 prisma 目录
    restore_prisma_to_repo


    # 验证构建结果
    verify_build

    # 显示构建信息
    show_build_info
}

# 执行主函数
main "$@"

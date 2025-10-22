#!/bin/bash

# 生产环境打包脚本
# 将数据库初始化功能从 electron-main.js 分离到打包流程中

set -e  # 遇到错误立即退出

# 默认参数
PLATFORM=""
BUILD_TYPE="production"
SKIP_DB_INIT=false
SKIP_BACKUP=false
VERBOSE=false
HELP=false

# 显示帮助信息
show_help() {
    echo "🚀 Mock System 生产环境打包脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -p, --platform PLATFORM    指定构建平台 (mac|win|linux|all)"
    echo "  -t, --type TYPE             构建类型 (production|development) [默认: production]"
    echo "  --skip-db-init             跳过数据库初始化"
    echo "  --skip-backup              跳过 prisma 备份"
    echo "  -v, --verbose              显示详细输出"
    echo "  -h, --help                 显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                          # 默认构建 (Mac 生产版本)"
    echo "  $0 -p mac                   # 构建 Mac 版本"
    echo "  $0 -p win                   # 构建 Windows 版本"
    echo "  $0 -p all                   # 构建所有平台"
    echo "  $0 --skip-db-init           # 跳过数据库初始化"
    echo "  $0 -v                       # 显示详细输出"
    echo ""
}

# 解析命令行参数
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--platform)
                PLATFORM="$2"
                shift 2
                ;;
            -t|--type)
                BUILD_TYPE="$2"
                shift 2
                ;;
            --skip-db-init)
                SKIP_DB_INIT=true
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                HELP=true
                shift
                ;;
            *)
                print_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# 验证参数
validate_arguments() {
    if [[ "$HELP" == true ]]; then
        show_help
        exit 0
    fi

    # 验证平台参数
    if [[ -n "$PLATFORM" ]]; then
        case "$PLATFORM" in
            mac|win|linux|all)
                ;;
            *)
                print_error "无效的平台: $PLATFORM"
                print_error "支持的平台: mac, win, linux, all"
                exit 1
                ;;
        esac
    fi

    # 验证构建类型
    case "$BUILD_TYPE" in
        production|development)
            ;;
        *)
            print_error "无效的构建类型: $BUILD_TYPE"
            print_error "支持的构建类型: production, development"
            exit 1
            ;;
    esac
}

# 显示构建配置
show_build_config() {
    print_message "构建配置:"
    print_message "  平台: ${PLATFORM:-"默认 (Mac)"}"
    print_message "  类型: $BUILD_TYPE"
    print_message "  跳过数据库初始化: $SKIP_DB_INIT"
    print_message "  跳过备份: $SKIP_BACKUP"
    print_message "  详细输出: $VERBOSE"
    echo ""
}

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
PRISMA_BACKUP_DIR=""

# 备份 prisma 文件夹
backup_prisma() {
    print_message "备份 prisma 文件夹..."
    if [ -d "prisma" ]; then
        # 在函数内生成时间戳，确保一致性
        PRISMA_BACKUP_DIR="prisma_backup_$(date +%Y%m%d%H%M%S)"
        export PRISMA_BACKUP_DIR  # 导出变量使其全局可用
        cp -R prisma "$PRISMA_BACKUP_DIR"
        print_success "已备份 prisma 到: $PRISMA_BACKUP_DIR"
        print_message "备份目录变量: PRISMA_BACKUP_DIR=$PRISMA_BACKUP_DIR"
    else
        print_warning "未找到 prisma 目录，跳过备份"
        PRISMA_BACKUP_DIR=""
        export PRISMA_BACKUP_DIR
    fi
}

# 将备份的 prisma 覆盖回仓库原始位置（./prisma）
restore_prisma_to_repo() {
    print_message "将备份的 prisma 覆盖回项目原始位置..."
    print_message "备份目录变量: PRISMA_BACKUP_DIR=$PRISMA_BACKUP_DIR"

    if [ -z "$PRISMA_BACKUP_DIR" ] || [ ! -d "$PRISMA_BACKUP_DIR" ]; then
        print_warning "备份目录不存在或为空: '$PRISMA_BACKUP_DIR'"
        print_message "可用的备份目录："
        ls -d prisma_backup_* 2>/dev/null || print_message "  (无可用备份目录)"
        return 1
    fi

    print_message "找到备份目录: $PRISMA_BACKUP_DIR"
    print_message "备份目录内容："
    ls -la "$PRISMA_BACKUP_DIR"

    # 确保目标目录存在
    mkdir -p prisma

    # 清空原 prisma 目录（保留目录本身）
    print_message "清理现有 prisma 目录..."
    find prisma -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null || true

    # 复制备份内容回原位置
    print_message "从备份恢复文件..."
    if cp -R "$PRISMA_BACKUP_DIR/"* prisma/; then
        print_success "已将备份的 prisma 覆盖回 ./prisma"
        print_message "恢复后的 prisma 目录内容："
        ls -la prisma/
    else
        print_error "恢复 prisma 目录失败"
        return 1
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
    node build-production.js --init-db-only
    print_success "数据库初始化完成"
}

# 构建 Electron 应用
build_electron() {
    print_message "构建 Electron 应用..."

    # 调试信息：显示系统类型
    local os_type=$(uname -s)
    print_message "当前操作系统类型: $os_type"

    # 根据命令行参数或操作系统选择构建命令
    local build_cmd=""

    if [[ -n "$PLATFORM" ]]; then
        # 使用命令行指定的平台
        case "$PLATFORM" in
            mac)
                build_cmd="npm run build-mac-pre"
                print_message "构建 macOS 版本..."
                ;;
            win)
                # 检查是否支持跨平台构建
                if [[ "$os_type" == "Darwin"* ]]; then
                    print_warning "在 macOS 上构建 Windows 版本可能失败"
                    print_warning "原因: 原生依赖无法跨平台编译"
                    print_message "尝试构建 Windows 版本..."
                fi
                build_cmd="npm run build-win"
                print_message "构建 Windows 版本..."
                ;;
            linux)
                # 检查是否支持跨平台构建
                if [[ "$os_type" == "Darwin"* ]]; then
                    print_warning "在 macOS 上构建 Linux 版本可能失败"
                    print_warning "原因: 原生依赖无法跨平台编译"
                    print_message "尝试构建 Linux 版本..."
                fi
                build_cmd="npm run build-linux"
                print_message "构建 Linux 版本..."
                ;;
            all)
                print_message "构建所有平台版本..."
                build_all_platforms
                return
                ;;
        esac
    else
        # 根据操作系统自动选择
        case "$os_type" in
            Darwin*)
                build_cmd="npm run build-mac-pre"
                print_message "检测到 macOS，构建 macOS 版本..."
                ;;
            Linux*)
                build_cmd="npm run build-linux"
                print_message "检测到 Linux，构建 Linux 版本..."
                ;;
            CYGWIN*|MINGW32*|MSYS*|MINGW*)
                build_cmd="npm run build-win"
                print_message "检测到 Windows，构建 Windows 版本..."
                ;;
            *)
                build_cmd="npm run build"
                print_warning "未知操作系统 ($os_type)，使用默认构建..."
                ;;
        esac
    fi

    # 执行构建命令
    if [[ -n "$build_cmd" ]]; then
        print_message "执行命令: $build_cmd"
        if [[ "$VERBOSE" == true ]]; then
            $build_cmd
        else
            $build_cmd > /dev/null 2>&1
        fi
    fi

    print_success "Electron 应用构建完成"
}

# 构建所有平台
build_all_platforms() {
    print_message "开始构建所有平台..."

    # 检查当前操作系统
    local os_type=$(uname -s)
    print_message "当前操作系统: $os_type"

    # 构建 macOS
    print_message "构建 macOS 版本..."
    npm run build-mac-pre

    # 根据操作系统决定是否构建其他平台
    case "$os_type" in
        Darwin*)
            print_warning "在 macOS 上无法构建 Windows 和 Linux 版本"
            print_warning "建议使用 GitHub Actions 或 Docker 进行跨平台构建"
            print_message "跳过 Windows 和 Linux 构建"
            ;;
        Linux*)
            print_warning "在 Linux 上无法构建 Windows 版本"
            print_message "跳过 Windows 构建"
            ;;
        CYGWIN*|MINGW32*|MSYS*|MINGW*)
            print_warning "在 Windows 上无法构建 macOS 和 Linux 版本"
            print_message "跳过 macOS 和 Linux 构建"
            ;;
    esac

    print_success "当前平台构建完成"
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

    # 恢复 prisma 目录（如果有备份的话）
    if [ -n "$PRISMA_BACKUP_DIR" ] && [ -d "$PRISMA_BACKUP_DIR" ]; then
        print_message "恢复 prisma 目录..."
        restore_prisma_to_repo || print_warning "恢复 prisma 目录失败"
    else
        # 尝试找到最新的备份目录
        latest_backup=$(ls -d prisma_backup_* 2>/dev/null | tail -1)
        if [ -n "$latest_backup" ] && [ -d "$latest_backup" ]; then
            print_message "使用最新备份恢复: $latest_backup"
            PRISMA_BACKUP_DIR="$latest_backup"
            restore_prisma_to_repo || print_warning "从 $latest_backup 恢复 prisma 目录失败"
        fi
    fi

    exit 1
}

# 设置错误陷阱
trap handle_error ERR

# 主执行流程
main() {
    # 解析命令行参数
    parse_arguments "$@"

    # 验证参数
    validate_arguments

    # 显示构建配置
    show_build_config

    print_message "开始生产环境打包流程..."

    # 检查命令
    check_commands

    # 清理构建
    clean_build

    # 生成 Prisma 客户端
    generate_prisma

    # 备份 prisma（初始化数据库之前）
    if [[ "$SKIP_BACKUP" != true ]]; then
        backup_prisma
    else
        print_message "跳过 prisma 备份"
    fi

    # 初始化数据库
    if [[ "$SKIP_DB_INIT" != true ]]; then
        init_database
    else
        print_message "跳过数据库初始化"
    fi

    # 构建 Electron 应用
    build_electron

    # 使用备份覆盖回项目原始位置的 prisma 目录
    if [[ "$SKIP_BACKUP" != true ]]; then
        print_message "准备恢复 prisma 目录..."
        restore_prisma_to_repo
    else
        print_message "跳过 prisma 恢复"
    fi

    # 验证构建结果
    verify_build

    # 显示构建信息
    show_build_info
}

# 执行主函数
main "$@"

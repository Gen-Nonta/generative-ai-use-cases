#!/bin/bash

echo "=== リージョン別ECR権限診断 ==="

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

REGIONS=("ap-northeast-1" "us-east-1" "us-west-2")

for region in "${REGIONS[@]}"; do
  echo -e "\n${YELLOW}========================================${NC}"
  echo -e "${YELLOW}リージョン: $region${NC}"
  echo -e "${YELLOW}========================================${NC}"
  
  # 1. DescribeRepositories テスト
  echo -n "DescribeRepositories: "
  if aws ecr describe-repositories --region $region --max-items 1 &>/dev/null; then
    echo -e "${GREEN}✓ 成功${NC}"
  else
    echo -e "${RED}✗ 失敗${NC}"
    aws ecr describe-repositories --region $region --max-items 1 2>&1 | head -3
  fi
  
  # 2. 既存のCDKリポジトリ確認
  echo "既存のCDKリポジトリ:"
  CDK_REPOS=$(aws ecr describe-repositories \
    --region $region \
    --query 'repositories[?contains(repositoryName, `cdk-`)].repositoryName' \
    --output text 2>/dev/null || echo "")
  
  if [ -n "$CDK_REPOS" ]; then
    echo "  $CDK_REPOS"
  else
    echo "  なし"
  fi
  
  # 3. CreateRepository テスト
  echo -n "CreateRepository テスト: "
  TEST_REPO="test-permission-$(date +%s)"
  
  CREATE_OUTPUT=$(aws ecr create-repository \
    --repository-name $TEST_REPO \
    --region $region 2>&1)
  
  if echo "$CREATE_OUTPUT" | grep -q "repositoryArn"; then
    echo -e "${GREEN}✓ 成功${NC}"
    # クリーンアップ
    aws ecr delete-repository \
      --repository-name $TEST_REPO \
      --region $region \
      --force &>/dev/null
  else
    echo -e "${RED}✗ 失敗${NC}"
    echo "  エラー: $(echo "$CREATE_OUTPUT" | grep -oP '(?<=message": ")[^"]*' || echo "$CREATE_OUTPUT")"
  fi
  
  # 4. GetAuthorizationToken テスト
  echo -n "GetAuthorizationToken: "
  if aws ecr get-authorization-token --region $region &>/dev/null; then
    echo -e "${GREEN}✓ 成功${NC}"
  else
    echo -e "${RED}✗ 失敗${NC}"
  fi
  
  # 5. CDKToolkit スタック状態
  echo -n "CDKToolkit スタック: "
  STACK_STATUS=$(aws cloudformation describe-stacks \
    --stack-name CDKToolkit \
    --region $region \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null || echo "NOT_EXISTS")
  echo "$STACK_STATUS"
  
done

# 6. アタッチされているポリシー一覧
echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}アタッチされているIAMポリシー${NC}"
echo -e "${YELLOW}========================================${NC}"
aws iam list-attached-user-policies \
  --user-name bedrock-cline-user \
  --output table

# 7. インラインポリシーの確認
echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}インラインポリシー${NC}"
echo -e "${YELLOW}========================================${NC}"
INLINE_POLICIES=$(aws iam list-user-policies \
  --user-name bedrock-cline-user \
  --query 'PolicyNames' \
  --output json)

if [ "$INLINE_POLICIES" != "[]" ]; then
  echo "$INLINE_POLICIES" | jq -r '.[]' | while read policy; do
    echo -e "\n${YELLOW}ポリシー名: $policy${NC}"
    aws iam get-user-policy \
      --user-name bedrock-cline-user \
      --policy-name $policy \
      --query 'PolicyDocument' | jq '.'
  done
else
  echo "インラインポリシーなし"
fi

echo -e "\n${GREEN}診断完了${NC}"

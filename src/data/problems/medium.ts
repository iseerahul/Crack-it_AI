import { Language, Problem } from '../../types/coding';

export const mediumProblems: Problem[] = [
  {
    id: 16, title: "Binary Tree Inorder Traversal", difficulty: "Medium", tags: ["Trees"], score: 20,
    description: "Given the root of a binary tree, return the inorder traversal of its nodes' values.",
    examples: [{ input: "root = [1,null,2,3]", output: "[1,3,2]" }],
    testCases: [{ input: { root: [1,2] }, expected: [2,1] }],
    solutions: {
      javascript: `function solution({ root }) {\n  const res = [];\n  const traverse = (node) => {\n    if (!node) return;\n    traverse(node.left);\n    res.push(node.val);\n    traverse(node.right);\n  };\n  traverse(root);\n  return res;\n}`,
      python: `def inorderTraversal(root):\n    res = []\n    def traverse(node):\n        if not node: return\n        traverse(node.left)\n        res.append(node.val)\n        traverse(node.right)\n    traverse(root)\n    return res`,
      cpp: `vector<int> inorderTraversal(TreeNode* root) {\n    vector<int> res;\n    stack<TreeNode*> st;\n    while (root || !st.empty()) {\n        while (root) { st.push(root); root = root->left; }\n        root = st.top(); st.pop();\n        res.push_back(root->val);\n        root = root->right;\n    }\n    return res;\n}`,
      java: `public List<Integer> inorderTraversal(TreeNode root) {\n    List<Integer> res = new ArrayList<>();\n    Stack<TreeNode> stack = new Stack<>();\n    while (root != null || !stack.isEmpty()) {\n        while (root != null) { stack.push(root); root = root.left; }\n        root = stack.pop();\n        res.add(root.val);\n        root = root.right;\n    }\n    return res;\n}`
    }
  },
  {
    id: 17, title: "Longest Substring Without Repeating", difficulty: "Medium", tags: ["Strings", "Sliding Window"], score: 25,
    description: "Find the length of the longest substring without repeating characters.",
    examples: [{ input: 's = "abcabcbb"', output: "3" }],
    testCases: [{ input: { s: "pwwkew" }, expected: 3 }],
    solutions: {
      javascript: `function solution({ s }) {\n  let set = new Set(), l = 0, max = 0;\n  for (let r = 0; r < s.length; r++) {\n    while (set.has(s[r])) set.delete(s[l++]);\n    set.add(s[r]);\n    max = Math.max(max, r - l + 1);\n  }\n  return max;\n}`,
      python: `def lengthOfLongestSubstring(s):\n    charSet = set()\n    l = 0\n    res = 0\n    for r in range(len(s)):\n        while s[r] in charSet:\n            charSet.remove(s[l])\n            l += 1\n        charSet.add(s[r])\n        res = max(res, r - l + 1)\n    return res`,
      cpp: `int lengthOfLongestSubstring(string s) {\n    unordered_set<char> charSet;\n    int l = 0, res = 0;\n    for (int r = 0; r < s.size(); r++) {\n        while (charSet.count(s[r])) charSet.erase(s[l++]);\n        charSet.insert(s[r]);\n        res = max(res, r - l + 1);\n    }\n    return res;\n}`,
      java: `public int lengthOfLongestSubstring(String s) {\n    Set<Character> set = new HashSet<>();\n    int l = 0, res = 0;\n    for (int r = 0; r < s.length(); r++) {\n        while (set.contains(s.charAt(r))) set.remove(s.charAt(l++));\n        set.add(s.charAt(r));\n        res = Math.max(res, r - l + 1);\n    }\n    return res;\n}`
    }
  },
  {
    id: 18, title: "Number of Islands", difficulty: "Medium", tags: ["Graphs", "DFS"], score: 30,
    description: "Given an m x n 2D binary grid which represents a map of '1's (land) and '0's (water), return the number of islands.",
    examples: [{ input: "grid = [['1','1','0']...]", output: "1" }],
    testCases: [{ input: { grid: [["1"]] }, expected: 1 }],
    solutions: {
      javascript: `function solution({ grid }) {\n  let count = 0;\n  const dfs = (r, c) => {\n    if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length || grid[r][c] === '0') return;\n    grid[r][c] = '0';\n    dfs(r+1, c); dfs(r-1, c); dfs(r, c+1); dfs(r, c-1);\n  };\n  for (let r = 0; r < grid.length; r++) {\n    for (let c = 0; c < grid[0].length; c++) {\n      if (grid[r][c] === '1') { count++; dfs(r, c); }\n    }\n  }\n  return count;\n}`,
      python: `def numIslands(grid):\n    if not grid: return 0\n    rows, cols = len(grid), len(grid[0])\n    visit = set()\n    islands = 0\n    def bfs(r, c):\n        q = collections.deque()\n        visit.add((r, c))\n        q.append((r, c))\n        while q:\n            row, col = q.popleft()\n            directions = [[1, 0], [-1, 0], [0, 1], [0, -1]]\n            for dr, dc in directions:\n                r, c = row + dr, col + dc\n                if (r in range(rows) and c in range(cols) and grid[r][c] == "1" and (r, c) not in visit):\n                    q.append((r, c))\n                    visit.add((r, c))\n    for r in range(rows):\n        for c in range(cols):\n            if grid[r][c] == "1" and (r, c) not in visit:\n                bfs(r, c)\n                islands += 1\n    return islands`,
      cpp: `void dfs(vector<vector<char>>& grid, int r, int c) {\n    if (r < 0 || c < 0 || r >= grid.size() || c >= grid[0].size() || grid[r][c] == '0') return;\n    grid[r][c] = '0';\n    dfs(grid, r+1, c); dfs(grid, r-1, c); dfs(grid, r, c+1); dfs(grid, r, c-1);\n}\nint numIslands(vector<vector<char>>& grid) {\n    int count = 0;\n    for (int r = 0; r < grid.size(); r++) {\n        for (int c = 0; c < grid[0].size(); c++) {\n            if (grid[r][c] == '1') { count++; dfs(grid, r, c); }\n        }\n    }\n    return count;\n}`,
      java: `public int numIslands(char[][] grid) {\n    int count = 0;\n    for (int r = 0; r < grid.length; r++) {\n        for (int c = 0; c < grid[0].length; c++) {\n            if (grid[r][c] == '1') { count++; dfs(grid, r, c); }\n        }\n    }\n    return count;\n}\nprivate void dfs(char[][] grid, int r, int c) {\n    if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length || grid[r][c] == '0') return;\n    grid[r][c] = '0';\n    dfs(grid, r+1, c); dfs(grid, r-1, c); dfs(grid, r, c+1); dfs(grid, r, c-1);\n}`
    }
  },
  {
    id: 19, title: "Coin Change", difficulty: "Medium", tags: ["Dynamic Programming"], score: 30,
    description: "Find the fewest number of coins that you need to make up a given amount.",
    examples: [{ input: "coins = [1,2,5], amount = 11", output: "3" }],
    testCases: [{ input: { coins: [1], amount: 2 }, expected: 2 }],
    solutions: {
      javascript: `function solution({ coins, amount }) {\n  const dp = Array(amount + 1).fill(Infinity);\n  dp[0] = 0;\n  for (let a = 1; a <= amount; a++) {\n    for (let c of coins) {\n      if (a - c >= 0) dp[a] = Math.min(dp[a], 1 + dp[a - c]);\n    }\n  }\n  return dp[amount] === Infinity ? -1 : dp[amount];\n}`,
      python: `def coinChange(coins, amount):\n    dp = [amount + 1] * (amount + 1)\n    dp[0] = 0\n    for a in range(1, amount + 1):\n        for c in coins:\n            if a - c >= 0:\n                dp[a] = min(dp[a], 1 + dp[a - c])\n    return dp[amount] if dp[amount] != amount + 1 else -1`,
      cpp: `int coinChange(vector<int>& coins, int amount) {\n    vector<int> dp(amount + 1, amount + 1);\n    dp[0] = 0;\n    for (int a = 1; a <= amount; a++) {\n        for (int c : coins) if (a >= c) dp[a] = min(dp[a], 1 + dp[a - c]);\n    }\n    return dp[amount] > amount ? -1 : dp[amount];\n}`,
      java: `public int coinChange(int[] coins, int amount) {\n    int[] dp = new int[amount + 1];\n    Arrays.fill(dp, amount + 1);\n    dp[0] = 0;\n    for (int a = 1; a <= amount; a++) {\n        for (int c : coins) if (a >= c) dp[a] = Math.min(dp[a], 1 + dp[a - c]);\n    }\n    return dp[amount] > amount ? -1 : dp[amount];\n}`
    }
  },
  {
    id: 20, title: "3Sum", difficulty: "Medium", tags: ["Arrays", "Two Pointers"], score: 25,
    description: "Find all unique triplets in the array which gives the sum of zero.",
    examples: [{ input: "nums = [-1,0,1,2,-1,-4]", output: "[[-1,-1,2],[-1,0,1]]" }],
    testCases: [{ input: { nums: [0,0,0] }, expected: [[0,0,0]] }],
    solutions: {
      javascript: `function solution({ nums }) {\n  nums.sort((a, b) => a - b);\n  const res = [];\n  for (let i = 0; i < nums.length; i++) {\n    if (i > 0 && nums[i] === nums[i-1]) continue;\n    let l = i + 1, r = nums.length - 1;\n    while (l < r) {\n      const sum = nums[i] + nums[l] + nums[r];\n      if (sum === 0) {\n        res.push([nums[i], nums[l], nums[r]]);\n        while (l < r && nums[l] === nums[l+1]) l++;\n        l++;\n      } else if (sum < 0) l++;\n      else r--;\n    }\n  }\n  return res;\n}`,
      python: `def threeSum(nums):\n    res = []\n    nums.sort()\n    for i, a in enumerate(nums):\n        if i > 0 and a == nums[i - 1]: continue\n        l, r = i + 1, len(nums) - 1\n        while l < r:\n            threeSum = a + nums[l] + nums[r]\n            if threeSum > 0: r -= 1\n            elif threeSum < 0: l += 1\n            else:\n                res.append([a, nums[l], nums[r]])\n                l += 1\n                while nums[l] == nums[l - 1] and l < r: l += 1\n    return res`,
      cpp: `vector<vector<int>> threeSum(vector<int>& nums) {\n    sort(nums.begin(), nums.end());\n    vector<vector<int>> res;\n    for (int i = 0; i < nums.size(); i++) {\n        if (i > 0 && nums[i] == nums[i-1]) continue;\n        int l = i + 1, r = nums.size() - 1;\n        while (l < r) {\n            int sum = nums[i] + nums[l] + nums[r];\n            if (sum == 0) {\n                res.push_back({nums[i], nums[l], nums[r]});\n                while (l < r && nums[l] == nums[l+1]) l++;\n                l++;\n            } else if (sum < 0) l++;\n            else r--;\n        }\n    }\n    return res;\n}`,
      java: `public List<List<Integer>> threeSum(int[] nums) {\n    Arrays.sort(nums);\n    List<List<Integer>> res = new ArrayList<>();\n    for (int i = 0; i < nums.length; i++) {\n        if (i > 0 && nums[i] == nums[i-1]) continue;\n        int l = i + 1, r = nums.length - 1;\n        while (l < r) {\n            int sum = nums[i] + nums[l] + nums[r];\n            if (sum == 0) {\n                res.add(Arrays.asList(nums[i], nums[l], nums[r]));\n                while (l < r && nums[l] == nums[l+1]) l++;\n                l++;\n            } else if (sum < 0) l++;\n            else r--;\n        }\n    }\n    return res;\n}`
    }
  },
  {
    id: 21, title: "Generate Parentheses", difficulty: "Medium", tags: ["Backtracking"], score: 25,
    description: "Given n pairs of parentheses, write a function to generate all combinations of well-formed parentheses.",
    examples: [{ input: "n = 3", output: '["((()))","(()())"...]' }],
    testCases: [{ input: { n: 1 }, expected: ["()"] }],
    solutions: {
      javascript: `function solution({ n }) {\n  const res = [];\n  const backtrack = (s, open, close) => {\n    if (s.length === 2 * n) { res.push(s); return; }\n    if (open < n) backtrack(s + '(', open + 1, close);\n    if (close < open) backtrack(s + ')', open, close + 1);\n  };\n  backtrack('', 0, 0);\n  return res;\n}`,
      python: `def generateParenthesis(n):\n    stack = []\n    res = []\n    def backtrack(openN, closedN):\n        if openN == closedN == n:\n            res.append("".join(stack))\n            return\n        if openN < n:\n            stack.append("(")\n            backtrack(openN + 1, closedN)\n            stack.pop()\n        if closedN < openN:\n            stack.append(")")\n            backtrack(openN, closedN + 1)\n            stack.pop()\n    backtrack(0, 0)\n    return res`,
      cpp: `void backtrack(vector<string>& res, string s, int open, int close, int n) {\n    if (s.size() == 2 * n) { res.push_back(s); return; }\n    if (open < n) backtrack(res, s + '(', open + 1, close, n);\n    if (close < open) backtrack(res, s + ')', open, close + 1, n);\n}\nvector<string> generateParenthesis(int n) {\n    vector<string> res;\n    backtrack(res, "", 0, 0, n);\n    return res;\n}`,
      java: `public List<String> generateParenthesis(int n) {\n    List<String> res = new ArrayList<>();\n    backtrack(res, "", 0, 0, n);\n    return res;\n}\nprivate void backtrack(List<String> res, String s, int open, int close, int n) {\n    if (s.length() == 2 * n) { res.add(s); return; }\n    if (open < n) backtrack(res, s + "(", open + 1, close, n);\n    if (close < open) backtrack(res, s + ")", open, close + 1, n);\n}`
    }
  },
  {
    id: 22, title: "Group Anagrams", difficulty: "Medium", tags: ["Hash Map"], score: 20,
    description: "Given an array of strings, group anagrams together.",
    examples: [{ input: '["eat","tea","tan"]', output: '[["tan"],["eat","tea"]]' }],
    testCases: [{ input: { s: ["a"] }, expected: [["a"]] }],
    solutions: {
      javascript: `function solution({ s }) {\n  const map = {};\n  for (let str of s) {\n    const key = str.split('').sort().join('');\n    if (!map[key]) map[key] = [];\n    map[key].push(str);\n  }\n  return Object.values(map);\n}`,
      python: `def productExceptSelf(nums):\n    res = [1] * (len(nums))\n    prefix = 1\n    for i in range(len(nums)):\n        res[i] = prefix\n        prefix *= nums[i]\n    postfix = 1\n    for i in range(len(nums) - 1, -1, -1):\n        res[i] *= postfix\n        postfix *= nums[i]\n    return res`,
      cpp: `vector<vector<string>> groupAnagrams(vector<string>& s) {\n    unordered_map<string, vector<string>> map;\n    for (string str : s) {\n        string key = str; sort(key.begin(), key.end());\n        map[key].push_back(str);\n    }\n    vector<vector<string>> res;\n    for (auto p : map) res.push_back(p.second);\n    return res;\n}`,
      java: `public List<List<String>> groupAnagrams(String[] s) {\n    Map<String, List<String>> map = new HashMap<>();\n    for (String str : s) {\n        char[] chars = str.toCharArray(); Arrays.sort(chars);\n        String key = new String(chars);\n        if (!map.containsKey(key)) map.put(key, new ArrayList<>());\n        map.get(key).add(str);\n    }\n    return new ArrayList<>(map.values());\n}`
    }
  },
  {
    id: 23, title: "Container With Most Water", difficulty: "Medium", tags: ["Two Pointers"], score: 20,
    description: "Find two lines that together with the x-axis forms a container, such that the container contains the most water.",
    examples: [{ input: "[1,8,6,2,5,4,8,3,7]", output: "49" }],
    testCases: [{ input: { h: [1,1] }, expected: 1 }],
    solutions: {
      javascript: `function solution({ h }) {\n  let l = 0, r = h.length - 1, max = 0;\n  while (l < r) {\n    max = Math.max(max, Math.min(h[l], h[r]) * (r - l));\n    if (h[l] < h[r]) l++; else r--;\n  }\n  return max;\n}`,
      python: `def maxArea(height):\n    res = 0\n    l, r = 0, len(height) - 1\n    while l < r:\n        area = (r - l) * min(height[l], height[r])\n        res = max(res, area)\n        if height[l] < height[r]: l += 1\n        else: r -= 1\n    return res`,
      cpp: `int maxArea(vector<int>& h) {\n    int l = 0, r = h.size() - 1, res = 0;\n    while (l < r) {\n        res = max(res, min(h[l], h[r]) * (r - l));\n        if (h[l] < h[r]) l++; else r--;\n    }\n    return res;\n}`,
      java: `public int maxArea(int[] h) {\n    int l = 0, r = h.length - 1, res = 0;\n    while (l < r) {\n        res = Math.max(res, Math.min(h[l], h[r]) * (r - l));\n        if (h[l] < h[r]) l++; else r--;\n    }\n    return res;\n}`
    }
  },
  {
    id: 24, title: "Course Schedule", difficulty: "Medium", tags: ["Graphs"], score: 35,
    description: "Determine if it is possible to finish all courses given prerequisites.",
    examples: [{ input: "2, [[1,0]]", output: "true" }],
    testCases: [{ input: { n: 2, p: [[1,0]] }, expected: true }],
    solutions: {
      javascript: `function solution({ n, p }) {\n  const adj = Array.from({ length: n }, () => []);\n  for (let [u, v] of p) adj[u].push(v);\n  const visit = new Set(), cycle = new Set();\n  const dfs = (u) => {\n    if (cycle.has(u)) return false;\n    if (visit.has(u)) return true;\n    cycle.add(u);\n    for (let v of adj[u]) if (!dfs(v)) return false;\n    cycle.delete(u); visit.add(u);\n    return true;\n  };\n  for (let i = 0; i < n; i++) if (!dfs(i)) return false;\n  return true;\n}`,
      python: `def canFinish(numCourses, prerequisites):\n    preMap = { i:[] for i in range(numCourses) }\n    for crs, pre in prerequisites: preMap[crs].append(pre)\n    visitSet = set()\n    def dfs(crs):\n        if crs in visitSet: return False\n        if preMap[crs] == []: return True\n        visitSet.add(crs)\n        for pre in preMap[crs]:\n            if not dfs(pre): return False\n        visitSet.remove(crs)\n        preMap[crs] = []\n        return True\n    for crs in range(numCourses):\n        if not dfs(crs): return False\n    return True`,
      cpp: `bool dfs(int u, vector<vector<int>>& adj, vector<int>& visit) {\n    if (visit[u] == 1) return false;\n    if (visit[u] == 2) return true;\n    visit[u] = 1;\n    for (int v : adj[u]) if (!dfs(v, adj, visit)) return false;\n    visit[u] = 2;\n    return true;\n}\nbool canFinish(int n, vector<vector<int>>& p) {\n    vector<vector<int>> adj(n);\n    for (auto& edge : p) adj[edge[0]].push_back(edge[1]);\n    vector<int> visit(n, 0);\n    for (int i = 0; i < n; i++) if (!dfs(i, adj, visit)) return false;\n    return true;\n}`,
      java: `public boolean canFinish(int n, int[][] p) {\n    List<List<Integer>> adj = new ArrayList<>();\n    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());\n    for (int[] edge : p) adj.get(edge[0]).add(edge[1]);\n    int[] visit = new int[n];\n    for (int i = 0; i < n; i++) if (!dfs(i, adj, visit)) return false;\n    return true;\n}\nprivate boolean dfs(int u, List<List<Integer>> adj, int[] visit) {\n    if (visit[u] == 1) return false;\n    if (visit[u] == 2) return true;\n    visit[u] = 1;\n    for (int v : adj.get(u)) if (!dfs(v, adj, visit)) return false;\n    visit[u] = 2;\n    return true;\n}`
    }
  },
  {
    id: 25, title: "Kth Largest Element", difficulty: "Medium", tags: ["Heap"], score: 25,
    description: "Find the kth largest element in an unsorted array.",
    examples: [{ input: "[3,2,3,1,2,4,5,5,6], k = 4", output: "4" }],
    testCases: [{ input: { nums: [1], k: 1 }, expected: 1 }],
    solutions: {
      javascript: `function solution({ nums, k }) {\n  nums.sort((a, b) => b - a);\n  return nums[k - 1];\n}`,
      python: `def findKthLargest(nums, k):\n    nums.sort()\n    return nums[len(nums) - k]`,
      cpp: `int findKthLargest(vector<int>& nums, int k) {\n    priority_queue<int, vector<int>, greater<int>> pq;\n    for (int n : nums) {\n        pq.push(n);\n        if (pq.size() > k) pq.pop();\n    }\n    return pq.top();\n}`,
      java: `public int findKthLargest(int[] nums, int k) {\n    PriorityQueue<Integer> pq = new PriorityQueue<>();\n    for (int n : nums) {\n        pq.add(n);\n        if (pq.size() > k) pq.poll();\n    }\n    return pq.peek();\n}`
    }
  },
  {
    id: 26, title: "Product of Array Except Self", difficulty: "Medium", tags: ["Arrays"], score: 25,
    description: "Return an array such that answer[i] is equal to the product of all elements of nums except nums[i].",
    examples: [{ input: "[1,2,3,4]", output: "[24,12,8,6]" }],
    testCases: [{ input: { nums: [1,2] }, expected: [2,1] }],
    solutions: {
      javascript: `function solution({ nums }) {\n  const n = nums.length, res = Array(n).fill(1);\n  let pre = 1, post = 1;\n  for (let i = 0; i < n; i++) { res[i] = pre; pre *= nums[i]; }\n  for (let i = n - 1; i >= 0; i--) { res[i] *= post; post *= nums[i]; }\n  return res;\n}`,
      python: `def productExceptSelf(nums):\n    res = [1] * (len(nums))\n    prefix = 1\n    for i in range(len(nums)):\n        res[i] = prefix\n        prefix *= nums[i]\n    postfix = 1\n    for i in range(len(nums) - 1, -1, -1):\n        res[i] *= postfix\n        postfix *= nums[i]\n    return res`,
      cpp: `vector<int> productExceptSelf(vector<int>& nums) {\n    int n = nums.size();\n    vector<int> res(n, 1);\n    int pre = 1, post = 1;\n    for (int i = 0; i < n; i++) { res[i] = pre; pre *= nums[i]; }\n    for (int i = n - 1; i >= 0; i--) { res[i] *= post; post *= nums[i]; }\n    return res;\n}`,
      java: `public int[] productExceptSelf(int[] nums) {\n    int n = nums.length;\n    int[] res = new int[n];\n    int pre = 1, post = 1;\n    for (int i = 0; i < n; i++) { res[i] = pre; pre *= nums[i]; }\n    for (int i = n - 1; i >= 0; i--) { res[i] *= post; post *= nums[i]; }\n    return res;\n}`
    }
  },
  {
    id: 27, title: "Subsets", difficulty: "Medium", tags: ["Backtracking"], score: 20,
    description: "Given an integer array nums of unique elements, return all possible subsets (the power set).",
    examples: [{ input: "[1,2,3]", output: "[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]" }],
    testCases: [{ input: { nums: [0] }, expected: [[],[0]] }],
    solutions: {
      javascript: `function solution({ nums }) {\n  const res = [[]];\n  for (let n of nums) {\n    const size = res.length;\n    for (let i = 0; i < size; i++) res.push([...res[i], n]);\n  }\n  return res;\n}`,
      python: `def subsets(nums):\n    res = []\n    subset = []\n    def dfs(i):\n        if i >= len(nums):\n            res.append(subset.copy())\n            return\n        subset.append(nums[i])\n        dfs(i + 1)\n        subset.pop()\n        dfs(i + 1)\n    dfs(0)\n    return res`,
      cpp: `void dfs(vector<int>& nums, int i, vector<int>& sub, vector<vector<int>>& res) {\n    if (i == nums.size()) { res.push_back(sub); return; }\n    sub.push_back(nums[i]);\n    dfs(nums, i + 1, sub, res);\n    sub.pop_back();\n    dfs(nums, i + 1, sub, res);\n}\nvector<vector<int>> subsets(vector<int>& nums) {\n    vector<vector<int>> res;\n    vector<int> sub;\n    dfs(nums, 0, sub, res);\n    return res;\n}`,
      java: `public List<List<Integer>> subsets(int[] nums) {\n    List<List<Integer>> res = new ArrayList<>();\n    backtrack(res, new ArrayList<>(), nums, 0);\n    return res;\n}\nprivate void backtrack(List<List<Integer>> res, List<Integer> sub, int[] nums, int start) {\n    res.add(new ArrayList<>(sub));\n    for (int i = start; i < nums.length; i++) {\n        sub.add(nums[i]);\n        backtrack(res, sub, nums, i + 1);\n        sub.remove(sub.size() - 1);\n    }\n}`
    }
  },
  {
    id: 28, title: "Longest Consecutive Sequence", difficulty: "Medium", tags: ["Hash Map"], score: 30,
    description: "Find the length of the longest consecutive elements sequence.",
    examples: [{ input: "[100,4,200,1,3,2]", output: "4" }],
    testCases: [{ input: { nums: [0,3,7,2,5,8,4,6,0,1] }, expected: 9 }],
    solutions: {
      javascript: `function solution({ nums }) {\n  const set = new Set(nums);\n  let max = 0;\n  for (let n of set) {\n    if (!set.has(n - 1)) {\n      let curr = n, count = 1;\n      while (set.has(curr + 1)) { curr++; count++; }\n      max = Math.max(max, count);\n    }\n  }\n  return max;\n}`,
      python: `def longestConsecutive(nums):\n    numSet = set(nums)\n    longest = 0\n    for n in nums:\n        if (n - 1) not in numSet:\n            length = 0\n            while (n + length) in numSet:\n                length += 1\n            longest = max(length, longest)\n    return longest`,
      cpp: `int longestConsecutive(vector<int>& nums) {\n    unordered_set<int> s(nums.begin(), nums.end());\n    int res = 0;\n    for (int n : s) {\n        if (!s.count(n - 1)) {\n            int curr = n, count = 1;\n            while (s.count(curr + 1)) { curr++; count++; }\n            res = max(res, count);\n        }\n    }\n    return res;\n}`,
      java: `public int longestConsecutive(int[] nums) {\n    Set<Integer> s = new HashSet<>();\n    for (int n : nums) s.add(n);\n    int res = 0;\n    for (int n : s) {\n        if (!s.contains(n - 1)) {\n            int curr = n, count = 1;\n            while (s.contains(curr + 1)) { curr++; count++; }\n            res = Math.max(res, count);\n        }\n    }\n    return res;\n}`
    }
  },
  {
    id: 29, title: "Rotated Sorted Array Search", difficulty: "Medium", tags: ["Binary Search"], score: 30,
    description: "Find the index of target in a rotated sorted array.",
    examples: [{ input: "nums = [4,5,6,7,0,1,2], target = 0", output: "4" }],
    testCases: [{ input: { nums: [4,5,6,7,0,1,2], target: 3 }, expected: -1 }],
    solutions: {
      javascript: `function solution({ nums, target }) {\n  let l = 0, r = nums.length - 1;\n  while (l <= r) {\n    let m = Math.floor((l + r) / 2);\n    if (nums[m] === target) return m;\n    if (nums[l] <= nums[m]) {\n      if (target >= nums[l] && target < nums[m]) r = m - 1; else l = m + 1;\n    } else {\n      if (target > nums[m] && target <= nums[r]) l = m + 1; else r = m - 1;\n    }\n  }\n  return -1;\n}`,
      python: `def search(nums, target):\n    l, r = 0, len(nums) - 1\n    while l <= r:\n        mid = (l + r) // 2\n        if target == nums[mid]: return mid\n        if nums[l] <= nums[mid]:\n            if target > nums[mid] or target < nums[l]: l = mid + 1\n            else: r = mid - 1\n        else:\n            if target < nums[mid] or target > nums[r]: r = mid - 1\n            else: l = mid + 1\n    return -1`,
      cpp: `int search(vector<int>& nums, int target) {\n    int l = 0, r = nums.size() - 1;\n    while (l <= r) {\n        int m = l + (r - l) / 2;\n        if (nums[m] == target) return m;\n        if (nums[l] <= nums[m]) {\n            if (target >= nums[l] && target < nums[m]) r = m - 1; else l = m + 1;\n        } else {\n            if (target > nums[m] && target <= nums[r]) l = m + 1; else r = m - 1;\n        }\n    }\n    return -1;\n}`,
      java: `public int search(int[] nums, int target) {\n    int l = 0, r = nums.length - 1;\n    while (l <= r) {\n        int m = l + (r - l) / 2;\n        if (nums[m] == target) return m;\n        if (nums[l] <= nums[m]) {\n            if (target >= nums[l] && target < nums[m]) r = m - 1; else l = m + 1;\n        } else {\n            if (target > nums[m] && target <= nums[r]) l = m + 1; else r = m - 1;\n        }\n    }\n    return -1;\n}`
    }
  },
  {
    id: 30, title: "Word Search", difficulty: "Medium", tags: ["Backtracking"], score: 35,
    description: "Determine if the word exists in the grid.",
    examples: [{ input: "board = [['A','B','C','E'],...], word = 'ABCCED'", output: "true" }],
    testCases: [{ input: { b: [["A"]], w: "A" }, expected: true }],
    solutions: {
      javascript: `function solution({ b, w }) {\n  const rows = b.length, cols = b[0].length;\n  const dfs = (r, c, i) => {\n    if (i === w.length) return true;\n    if (r < 0 || c < 0 || r >= rows || c >= cols || b[r][c] !== w[i]) return false;\n    const temp = b[r][c]; b[r][c] = '#';\n    const res = dfs(r+1, c, i+1) || dfs(r-1, c, i+1) || dfs(r, c+1, i+1) || dfs(r, c-1, i+1);\n    b[r][c] = temp; return res;\n  };\n  for (let r = 0; r < rows; r++) {\n    for (let c = 0; c < cols; c++) if (dfs(r, c, 0)) return true;\n  }\n  return false;\n}`,
      python: `def exist(board, word):\n    rows, cols = len(board), len(board[0])\n    path = set()\n    def dfs(r, c, i):\n        if i == len(word): return True\n        if (r < 0 or c < 0 or r >= rows or c >= cols or word[i] != board[r][c] or (r, c) in path): return False\n        path.add((r, c))\n        res = (dfs(r + 1, c, i + 1) or dfs(r - 1, c, i + 1) or dfs(r, c + 1, i + 1) or dfs(r, c - 1, i + 1))\n        path.remove((r, c))\n        return res\n    for r in range(rows):\n        for c in range(cols):\n            if dfs(r, c, 0): return True\n    return False`,
      cpp: `bool dfs(vector<vector<char>>& b, string& w, int r, int c, int i) {\n    if (i == w.size()) return true;\n    if (r < 0 || c < 0 || r >= b.size() || c >= b[0].size() || b[r][c] != w[i]) return false;\n    char temp = b[r][c]; b[r][c] = '#';\n    bool res = dfs(b, w, r+1, c, i+1) || dfs(b, w, r-1, c, i+1) || dfs(b, w, r, c+1, i+1) || dfs(b, w, r, c-1, i+1);\n    b[r][c] = temp; return res;\n}\nbool exist(vector<vector<char>>& b, string w) {\n    for (int r = 0; r < b.size(); r++)\n        for (int c = 0; c < b[0].size(); c++) if (dfs(b, w, r, c, 0)) return true;\n    return false;\n}`,
      java: `public boolean exist(char[][] b, String w) {\n    for (int r = 0; r < b.length; r++)\n        for (int c = 0; c < b[0].length; c++) if (dfs(b, w, r, c, 0)) return true;\n    return false;\n}\nprivate boolean dfs(char[][] b, String w, int r, int c, int i) {\n    if (i == w.length()) return true;\n    if (r < 0 || c < 0 || r >= b.length || c >= b[0].length || b[r][c] != w.charAt(i)) return false;\n    char temp = b[r][c]; b[r][c] = '#';\n    boolean res = dfs(b, w, r+1, c, i+1) || dfs(b, w, r-1, c, i+1) || dfs(b, w, r, c+1, i+1) || dfs(b, w, r, c-1, i+1);\n    b[r][c] = temp; return res;\n}`
    }
  }
];

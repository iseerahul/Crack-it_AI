import { Language, Problem } from '../../types/coding';

export const beginnerProblems: Problem[] = [
  {
    id: 1, title: "Two Sum", difficulty: "Beginner", tags: ["Arrays", "Hash Map"], score: 10,
    description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.",
    examples: [{ input: "nums = [2,7,11,15], target = 9", output: "[0,1]" }],
    testCases: [{ input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1] }],
    solutions: {
      javascript: `function solution({ nums, target }) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) return [map.get(complement), i];\n    map.set(nums[i], i);\n  }\n}`,
      python: `def solution(nums, target):\n    prevMap = {}\n    for i, n in enumerate(nums):\n        diff = target - n\n        if diff in prevMap:\n            return [prevMap[diff], i]\n        prevMap[n] = i`,
      cpp: `vector<int> twoSum(vector<int>& nums, int target) {\n    unordered_map<int, int> prevMap;\n    for (int i = 0; i < nums.size(); i++) {\n        int diff = target - nums[i];\n        if (prevMap.find(diff) != prevMap.end()) return {prevMap[diff], i};\n        prevMap[nums[i]] = i;\n    }\n    return {};\n}`,
      java: `public int[] twoSum(int[] nums, int target) {\n    HashMap<Integer, Integer> prevMap = new HashMap<>();\n    for (int i = 0; i < nums.length; i++) {\n        int diff = target - nums[i];\n        if (prevMap.containsKey(diff)) return new int[] { prevMap.get(diff), i };\n        prevMap.put(nums[i], i);\n    }\n    return new int[] {};\n}`
    }
  },
  {
    id: 2, title: "Valid Parentheses", difficulty: "Beginner", tags: ["Stack", "Strings"], score: 10,
    description: "Determine if the input string containing characters '(', ')', '{', '}', '[' and ']' is valid.",
    examples: [{ input: 's = "()"', output: "true" }],
    testCases: [{ input: { s: "()" }, expected: true }],
    solutions: {
      javascript: `function solution({ s }) {\n  const stack = [];\n  const map = { ')': '(', '}': '{', ']': '[' };\n  for (let char of s) {\n    if (map[char]) {\n      if (stack.pop() !== map[char]) return false;\n    } else stack.push(char);\n  }\n  return stack.length === 0;\n}`,
      python: `def isValid(s):\n    stack = []\n    closeToOpen = {")": "(", "]": "[", "}": "{"}\n    for c in s:\n        if c in closeToOpen:\n            if stack and stack[-1] == closeToOpen[c]:\n                stack.pop()\n            else:\n                return False\n        else:\n            stack.append(c)\n    return True if not stack else False`,
      cpp: `bool isValid(string s) {\n    stack<char> st;\n    for (char c : s) {\n        if (c == '(' || c == '{' || c == '[') st.push(c);\n        else {\n            if (st.empty() || (c == ')' && st.top() != '(') || (c == '}' && st.top() != '{') || (c == ']' && st.top() != '[')) return false;\n            st.pop();\n        }\n    }\n    return st.empty();\n}`,
      java: `public boolean isValid(String s) {\n    Stack<Character> stack = new Stack<>();\n    for (char c : s.toCharArray()) {\n        if (c == '(') stack.push(')');\n        else if (c == '{') stack.push('}');\n        else if (c == '[') stack.push(']');\n        else if (stack.isEmpty() || stack.pop() != c) return false;\n    }\n    return stack.isEmpty();\n}`
    }
  },
  {
    id: 3, title: "Palindrome Number", difficulty: "Beginner", tags: ["Math"], score: 10,
    description: "Determine whether an integer is a palindrome. An integer is a palindrome when it reads the same backward as forward.",
    examples: [{ input: "x = 121", output: "true" }],
    testCases: [{ input: { x: 121 }, expected: true }],
    solutions: {
      javascript: `function solution({ x }) {\n  if (x < 0) return false;\n  let rev = 0, temp = x;\n  while (temp > 0) {\n    rev = rev * 10 + (temp % 10);\n    temp = Math.floor(temp / 10);\n  }\n  return rev === x;\n}`,
      python: `def isPalindrome(x):\n    if x < 0: return False\n    div = 1\n    while x >= 10 * div:\n        div *= 10\n    while x:\n        if x // div != x % 10: return False\n        x = (x % div) // 10\n        div = div / 100\n    return True`,
      cpp: `bool isPalindrome(int x) {\n    if (x < 0) return false;\n    long long rev = 0, temp = x;\n    while (temp) {\n        rev = rev * 10 + temp % 10;\n        temp /= 10;\n    }\n    return rev == x;\n}`,
      java: `public boolean isPalindrome(int x) {\n    if (x < 0) return false;\n    int rev = 0, temp = x;\n    while (temp != 0) {\n        rev = rev * 10 + temp % 10;\n        temp /= 10;\n    }\n    return rev == x;\n}`
    }
  },
  {
    id: 4, title: "Reverse String", difficulty: "Beginner", tags: ["Strings"], score: 5,
    description: "Reverse an input array of characters in-place.",
    examples: [{ input: 's = ["h","e"]', output: '["e","h"]' }],
    testCases: [{ input: { s: ["a","b"] }, expected: ["b","a"] }],
    solutions: {
      javascript: `function solution({ s }) {\n  return s.reverse();\n}`,
      python: `def reverseString(s):\n    s.reverse()`,
      cpp: `void reverseString(vector<char>& s) {\n    reverse(s.begin(), s.end());\n}`,
      java: `public void reverseString(char[] s) {\n    int left = 0, right = s.length - 1;\n    while (left < right) {\n        char temp = s[left];\n        s[left++] = s[right];\n        s[right--] = temp;\n    }\n}`
    }
  },
  {
    id: 5, title: "Fizz Buzz", difficulty: "Beginner", tags: ["Math"], score: 5,
    description: "Return a string array where answer[i] is 'FizzBuzz' if i is divisible by 3 and 5, 'Fizz' if divisible by 3, 'Buzz' if divisible by 5, or the number itself.",
    examples: [{ input: "n = 3", output: '["1","2","Fizz"]' }],
    testCases: [{ input: { n: 3 }, expected: ["1","2","Fizz"] }],
    solutions: {
      javascript: `function solution({ n }) {\n  const res = [];\n  for (let i = 1; i <= n; i++) {\n    if (i % 15 === 0) res.push("FizzBuzz");\n    else if (i % 3 === 0) res.push("Fizz");\n    else if (i % 5 === 0) res.push("Buzz");\n    else res.push(i.toString());\n  }\n  return res;\n}`,
      python: `def fizzBuzz(n):\n    res = []\n    for i in range(1, n + 1):\n        if i % 15 == 0: res.append("FizzBuzz")\n        elif i % 3 == 0: res.append("Fizz")\n        elif i % 5 == 0: res.append("Buzz")\n        else: res.append(str(i))\n    return res`,
      cpp: `vector<string> fizzBuzz(int n) {\n    vector<string> res;\n    for (int i = 1; i <= n; i++) {\n        if (i % 15 == 0) res.push_back("FizzBuzz");\n        else if (i % 3 == 0) res.push_back("Fizz");\n        else if (i % 5 == 0) res.push_back("Buzz");\n        else res.push_back(to_string(i));\n    }\n    return res;\n}`,
      java: `public List<String> fizzBuzz(int n) {\n    List<String> res = new ArrayList<>();\n    for (int i = 1; i <= n; i++) {\n        if (i % 15 == 0) res.add("FizzBuzz");\n        else if (i % 3 == 0) res.add("Fizz");\n        else if (i % 5 == 0) res.add("Buzz");\n        else res.add(String.valueOf(i));\n    }\n    return res;\n}`
    }
  },
  {
    id: 6, title: "Max Depth of Binary Tree", difficulty: "Beginner", tags: ["Trees"], score: 10,
    description: "Find the maximum depth of a binary tree.",
    examples: [{ input: "root = [3,9,20,null,null,15,7]", output: "3" }],
    testCases: [{ input: { root: [1,2] }, expected: 2 }],
    solutions: {
      javascript: `function solution({ root }) {\n  if (!root) return 0;\n  return 1 + Math.max(solution({ root: root.left }), solution({ root: root.right }));\n}`,
      python: `def maxDepth(root):\n    if not root: return 0\n    return 1 + max(maxDepth(root.left), maxDepth(root.right))`,
      cpp: `int maxDepth(TreeNode* root) {\n    if (!root) return 0;\n    return 1 + max(maxDepth(root.left), maxDepth(root.right));\n}`,
      java: `public int maxDepth(TreeNode root) {\n    if (root == null) return 0;\n    return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));\n}`
    }
  },
  {
    id: 7, title: "Contains Duplicate", difficulty: "Beginner", tags: ["Arrays"], score: 5,
    description: "Return true if any value appears at least twice in the array.",
    examples: [{ input: "[1,2,3,1]", output: "true" }],
    testCases: [{ input: { nums: [1,2,3] }, expected: false }],
    solutions: {
      javascript: `function solution({ nums }) {\n  return new Set(nums).size !== nums.length;\n}`,
      python: `def containsDuplicate(nums):\n    return len(set(nums)) != len(nums)`,
      cpp: `bool containsDuplicate(vector<int>& nums) {\n    return nums.size() > unordered_set<int>(nums.begin(), nums.end()).size();\n}`,
      java: `public boolean containsDuplicate(int[] nums) {\n    Set<Integer> set = new HashSet<>();\n    for (int n : nums) if (!set.add(n)) return true;\n    return false;\n}`
    }
  },
  {
    id: 8, title: "Best Time to Buy and Sell Stock", difficulty: "Beginner", tags: ["Arrays"], score: 10,
    description: "Find the maximum profit you can achieve from one transaction.",
    examples: [{ input: "[7,1,5,3,6,4]", output: "5" }],
    testCases: [{ input: { prices: [1,2] }, expected: 1 }],
    solutions: {
      javascript: `function solution({ prices }) {\n  let min = Infinity, max = 0;\n  for (let p of prices) {\n    min = Math.min(min, p);\n    max = Math.max(max, p - min);\n  }\n  return max;\n}`,
      python: `def maxProfit(prices):\n    l, r = 0, 1\n    maxP = 0\n    while r < len(prices):\n        if prices[l] < prices[r]:\n            maxP = max(maxP, prices[r] - prices[l])\n        else:\n            l = r\n        r += 1\n    return maxP`,
      cpp: `int maxProfit(vector<int>& prices) {\n    int minP = INT_MAX, maxP = 0;\n    for (int p : prices) {\n        minP = min(minP, p);\n        maxP = max(maxP, p - minP);\n    }\n    return maxP;\n}`,
      java: `public int maxProfit(int[] prices) {\n    int minP = Integer.MAX_VALUE, maxP = 0;\n    for (int p : prices) {\n        minP = Math.min(minP, p);\n        maxP = Math.max(maxP, p - minP);\n    }\n    return maxP;\n}`
    }
  },
  {
    id: 9, title: "Valid Anagram", difficulty: "Beginner", tags: ["Strings"], score: 5,
    description: "Determine if t is an anagram of s.",
    examples: [{ input: 's = "anagram", t = "nagaram"', output: "true" }],
    testCases: [{ input: { s: "rat", t: "car" }, expected: false }],
    solutions: {
      javascript: `function solution({ s, t }) {\n  if (s.length !== t.length) return false;\n  return s.split('').sort().join('') === t.split('').sort().join('');\n}`,
      python: `def isAnagram(s, t):\n    return sorted(s) == sorted(t)`,
      cpp: `bool isAnagram(string s, string t) {\n    sort(s.begin(), s.end());\n    sort(t.begin(), t.end());\n    return s == t;\n}`,
      java: `public boolean isAnagram(String s, String t) {\n    char[] sArr = s.toCharArray(), tArr = t.toCharArray();\n    Arrays.sort(sArr); Arrays.sort(tArr);\n    return Arrays.equals(sArr, tArr);\n}`
    }
  },
  {
    id: 10, title: "Binary Search", difficulty: "Beginner", tags: ["Algorithms"], score: 10,
    description: "Given a sorted array and a target, return the index of the target using Binary Search.",
    examples: [{ input: "nums = [-1,0,3,5], target = 9", output: "-1" }],
    testCases: [{ input: { nums: [-1,0,3,5], target: 3 }, expected: 2 }],
    solutions: {
      javascript: `function solution({ nums, target }) {\n  let l = 0, r = nums.length - 1;\n  while (l <= r) {\n    let m = Math.floor((l + r) / 2);\n    if (nums[m] === target) return m;\n    if (nums[m] < target) l = m + 1;\n    else r = m - 1;\n  }\n  return -1;\n}`,
      python: `def search(nums, target):\n    l, r = 0, len(nums) - 1\n    while l <= r:\n        m = (l + r) // 2\n        if nums[m] == target: return m\n        if nums[m] < target: l = m + 1\n        else: r = m - 1\n    return -1`,
      cpp: `int search(vector<int>& nums, int target) {\n    int l = 0, r = nums.size() - 1;\n    while (l <= r) {\n        int m = l + (r - l) / 2;\n        if (nums[m] == target) return m;\n        if (nums[m] < target) l = m + 1;\n        else r = m - 1;\n    }\n    return -1;\n}`,
      java: `public int search(int[] nums, int target) {\n    int l = 0, r = nums.length - 1;\n    while (l <= r) {\n        int m = l + (r - l) / 2;\n        if (nums[m] == target) return m;\n        if (nums[m] < target) l = m + 1;\n        else r = m - 1;\n    }\n    return -1;\n}`
    }
  },
  {
    id: 11, title: "Single Number", difficulty: "Beginner", tags: ["Bitwise"], score: 10,
    description: "Every element appears twice except for one. Find that single one.",
    examples: [{ input: "[2,2,1]", output: "1" }],
    testCases: [{ input: { nums: [4,1,2,1,2] }, expected: 4 }],
    solutions: {
      javascript: `function solution({ nums }) {\n  return nums.reduce((a, b) => a ^ b, 0);\n}`,
      python: `def singleNumber(nums):\n    res = 0\n    for n in nums: res ^= n\n    return res`,
      cpp: `int singleNumber(vector<int>& nums) {\n    int res = 0;\n    for (int n : nums) res ^= n;\n    return res;\n}`,
      java: `public int singleNumber(int[] nums) {\n    int res = 0;\n    for (int n : nums) res ^= n;\n    return res;\n}`
    }
  },
  {
    id: 12, title: "Missing Number", difficulty: "Beginner", tags: ["Math"], score: 5,
    description: "Find the only number in the range [0, n] that is missing from the array.",
    examples: [{ input: "[3,0,1]", output: "2" }],
    testCases: [{ input: { nums: [0,1] }, expected: 2 }],
    solutions: {
      javascript: `function solution({ nums }) {\n  const n = nums.length;\n  const expected = (n * (n + 1)) / 2;\n  const actual = nums.reduce((a, b) => a + b, 0);\n  return expected - actual;\n}`,
      python: `def missingNumber(nums):\n    n = len(nums)\n    return (n * (n + 1)) // 2 - sum(nums)`,
      cpp: `int missingNumber(vector<int>& nums) {\n    int n = nums.size();\n    int sum = n * (n + 1) / 2;\n    for (int x : nums) sum -= x;\n    return sum;\n}`,
      java: `public int missingNumber(int[] nums) {\n    int n = nums.length;\n    int sum = n * (n + 1) / 2;\n    for (int x : nums) sum -= x;\n    return sum;\n}`
    }
  },
  {
    id: 13, title: "Move Zeroes", difficulty: "Beginner", tags: ["Arrays"], score: 5,
    description: "Move all 0's to the end of the array while maintaining the relative order of the non-zero elements.",
    examples: [{ input: "[0,1,0,3,12]", output: "[1,3,12,0,0]" }],
    testCases: [{ input: { nums: [0,1] }, expected: [1,0] }],
    solutions: {
      javascript: `function solution({ nums }) {\n  let l = 0;\n  for (let r = 0; r < nums.length; r++) {\n    if (nums[r] !== 0) {\n      [nums[l], nums[r]] = [nums[r], nums[l]];\n      l++;\n    }\n  }\n  return nums;\n}`,
      python: `def moveZeroes(nums):\n    l = 0\n    for r in range(len(nums)):\n        if nums[r]:\n            nums[l], nums[r] = nums[r], nums[l]\n            l += 1`,
      cpp: `void moveZeroes(vector<int>& nums) {\n    for (int l = 0, r = 0; r < nums.size(); r++) {\n        if (nums[r]) swap(nums[l++], nums[r]);\n    }\n}`,
      java: `public void moveZeroes(int[] nums) {\n    int l = 0;\n    for (int r = 0; r < nums.length; r++) {\n        if (nums[r] != 0) {\n            int temp = nums[l];\n            nums[l] = nums[r];\n            nums[r] = temp;\n            l++;\n        }\n    }\n}`
    }
  },
  {
    id: 14, title: "Plus One", difficulty: "Beginner", tags: ["Math"], score: 5,
    description: "Increment the large integer represented as an integer array by one.",
    examples: [{ input: "[1,2,3]", output: "[1,2,4]" }],
    testCases: [{ input: { d: [9] }, expected: [1,0] }],
    solutions: {
      javascript: `function solution({ d }) {\n  for (let i = d.length - 1; i >= 0; i--) {\n    if (d[i] < 9) {\n      d[i]++;\n      return d;\n    }\n    d[i] = 0;\n  }\n  return [1, ...d];\n}`,
      python: `def plusOne(digits):\n    for i in range(len(digits) - 1, -1, -1):\n        if digits[i] < 9:\n            digits[i] += 1\n            return digits\n        digits[i] = 0\n    return [1] + digits`,
      cpp: `vector<int> plusOne(vector<int>& d) {\n    for (int i = d.size() - 1; i >= 0; i--) {\n        if (d[i] < 9) { d[i]++; return d; }\n        d[i] = 0;\n    }\n    d.insert(d.begin(), 1);\n    return d;\n}`,
      java: `public int[] plusOne(int[] d) {\n    for (int i = d.length - 1; i >= 0; i--) {\n        if (d[i] < 9) { d[i]++; return d; }\n        d[i] = 0;\n    }\n    int[] res = new int[d.length + 1];\n    res[0] = 1;\n    return res;\n}`
    }
  },
  {
    id: 15, title: "Intersection of Two Arrays", difficulty: "Beginner", tags: ["Arrays"], score: 5,
    description: "Return an array of their intersection. Each element in the result must be unique.",
    examples: [{ input: "nums1 = [1,2,2,1], nums2 = [2,2]", output: "[2]" }],
    testCases: [{ input: { n1: [1], n2: [1] }, expected: [1] }],
    solutions: {
      javascript: `function solution({ n1, n2 }) {\n  const s1 = new Set(n1);\n  return [...new Set(n2.filter(x => s1.has(x)))];\n}`,
      python: `def intersection(nums1, nums2):\n    return list(set(nums1) & set(nums2))`,
      cpp: `vector<int> intersection(vector<int>& n1, vector<int>& n2) {\n    unordered_set<int> s(n1.begin(), n1.end()), res;\n    for (int x : n2) if (s.count(x)) res.insert(x);\n    return vector<int>(res.begin(), res.end());\n}`,
      java: `public int[] intersection(int[] n1, int[] n2) {\n    Set<Integer> s = new HashSet<>(), res = new HashSet<>();\n    for (int x : n1) s.add(x);\n    for (int x : n2) if (s.contains(x)) res.add(x);\n    return res.stream().mapToInt(i -> i).toArray();\n}`
    }
  }
];

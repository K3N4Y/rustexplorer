use std::path::{Component, Path};

#[derive(Debug, Clone, Eq, PartialEq)]
struct FuzzyMatch {
    score: i64,
    depth: usize,
    sort_key: String,
}

fn normalize_for_match(value: &str) -> Vec<char> {
    value.chars().flat_map(char::to_lowercase).collect()
}

fn path_depth(relative_path: &str) -> usize {
    relative_path
        .split(['/', '\\'])
        .filter(|segment| !segment.is_empty())
        .count()
        .saturating_sub(1)
}

fn normalize_relative_path(root: &Path, path: &Path) -> String {
    let relative = path.strip_prefix(root).unwrap_or(path);
    relative
        .components()
        .filter_map(|component| match component {
            Component::Normal(part) => Some(part.to_string_lossy().to_string()),
            _ => None,
        })
        .collect::<Vec<_>>()
        .join("/")
}

fn is_boundary(previous: Option<char>, current: char) -> bool {
    match previous {
        None => true,
        Some(prev) => {
            matches!(prev, '/' | '\\' | '.' | '_' | '-' | ' ')
                || (prev.is_lowercase() && current.is_uppercase())
        }
    }
}

fn score_candidate(query: &str, candidate: &str, name_bonus: i64, depth: usize) -> Option<FuzzyMatch> {
    let query_chars = normalize_for_match(query.trim());
    if query_chars.is_empty() {
        return None;
    }

    let candidate_chars: Vec<char> = candidate.chars().collect();
    let candidate_lower = normalize_for_match(candidate);
    let mut query_index = 0usize;
    let mut matched_positions = Vec::with_capacity(query_chars.len());

    for (candidate_index, candidate_char) in candidate_lower.iter().enumerate() {
        if query_index < query_chars.len() && *candidate_char == query_chars[query_index] {
            matched_positions.push(candidate_index);
            query_index += 1;
        }
    }

    if query_index != query_chars.len() {
        return None;
    }

    let mut score = 1000 + name_bonus;
    if matched_positions.first() == Some(&0) {
        score += 200;
    }

    for (offset, position) in matched_positions.iter().enumerate() {
        let current = candidate_chars.get(*position).copied().unwrap_or_default();
        let previous = position.checked_sub(1).and_then(|index| candidate_chars.get(index).copied());
        if is_boundary(previous, current) {
            score += 80;
        }
        if offset > 0 {
            let gap = position.saturating_sub(matched_positions[offset - 1] + 1);
            score -= gap as i64 * 8;
        }
    }

    score -= candidate_chars.len() as i64;
    score -= depth as i64 * 20;

    Some(FuzzyMatch {
        score,
        depth,
        sort_key: candidate.to_lowercase(),
    })
}

fn score_path_match(query: &str, name: &str, relative_path: &str) -> Option<FuzzyMatch> {
    let depth = path_depth(relative_path);
    let name_match = score_candidate(query, name, 250, depth);
    let path_match = score_candidate(query, relative_path, 0, depth);

    match (name_match, path_match) {
        (Some(name_score), Some(path_score)) => {
            if name_score.score >= path_score.score {
                Some(name_score)
            } else {
                Some(path_score)
            }
        }
        (Some(score), None) | (None, Some(score)) => Some(score),
        (None, None) => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn fuzzy_score_matches_app_css_by_name() {
        let score = score_path_match("appcs", "App.css", "src/App.css");
        assert!(score.is_some());
    }

    #[test]
    fn fuzzy_score_matches_app_css_by_relative_path() {
        let score = score_path_match("srcappcs", "App.css", "src/App.css");
        assert!(score.is_some());
    }

    #[test]
    fn fuzzy_score_matches_search_bar() {
        let score = score_path_match("srchbar", "SearchBar.tsx", "src/components/SearchBar.tsx");
        assert!(score.is_some());
    }

    #[test]
    fn fuzzy_score_rejects_non_subsequence() {
        let score = score_path_match("zzzz", "App.css", "src/App.css");
        assert!(score.is_none());
    }

    #[test]
    fn fuzzy_score_prefers_direct_name_match_over_long_path_match() {
        let direct = score_path_match("appcs", "App.css", "src/App.css").unwrap();
        let long = score_path_match(
            "appcs",
            "ConfigStore.txt",
            "archive/application/preferences/config/store/ConfigStore.txt",
        )
        .unwrap();

        assert!(direct.score > long.score);
    }

    #[test]
    fn fuzzy_score_rewards_separator_boundaries() {
        let boundary = score_candidate("ac", "app-cache", 0, 0).unwrap();
        let plain = score_candidate("ac", "appcache", 0, 0).unwrap();

        assert!(boundary.score > plain.score);
    }

    #[test]
    fn fuzzy_score_rewards_camel_case_boundaries() {
        let camel = score_candidate("sb", "SearchBar", 0, 0).unwrap();
        let plain = score_candidate("sb", "searchbar", 0, 0).unwrap();

        assert!(camel.score > plain.score);
    }

    #[test]
    fn normalize_relative_path_uses_forward_slashes() {
        let root = PathBuf::from("C:/project");
        let path = PathBuf::from("C:/project/src/App.css");

        assert_eq!(normalize_relative_path(&root, &path), "src/App.css");
    }
}

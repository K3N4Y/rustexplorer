use crate::models::file_detail_dto::FileDetailDTO;
use std::path::{Component, Path, PathBuf};
use std::time::{Duration, Instant};

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

const DEFAULT_SEARCH_LIMIT: usize = 200;
const SNAPSHOT_EMIT_INTERVAL: Duration = Duration::from_millis(50);

#[derive(Debug, Clone)]
struct ScoredSearchResult {
    score: i64,
    depth: usize,
    sort_key: String,
    name: String,
    relative_path: String,
    path: PathBuf,
    size: u64,
    modified: Option<String>,
    is_dir: bool,
}

impl ScoredSearchResult {
    fn into_file_detail(self) -> FileDetailDTO {
        FileDetailDTO {
            name: self.name,
            path: self.path,
            size: self.size,
            modified: self.modified,
            is_dir: self.is_dir,
        }
    }
}

#[derive(Debug)]
struct RankedResults {
    limit: usize,
    items: Vec<ScoredSearchResult>,
}

impl RankedResults {
    fn new(limit: usize) -> Self {
        Self {
            limit: limit.max(1),
            items: Vec::new(),
        }
    }

    fn push(&mut self, item: ScoredSearchResult) {
        self.items.push(item);
        self.sort_items();
        if self.items.len() > self.limit {
            self.items.truncate(self.limit);
        }
    }

    fn snapshot(&self) -> Vec<ScoredSearchResult> {
        self.items.clone()
    }

    fn snapshot_file_details(&self) -> Vec<FileDetailDTO> {
        self.snapshot()
            .into_iter()
            .map(ScoredSearchResult::into_file_detail)
            .collect()
    }

    fn sort_items(&mut self) {
        self.items.sort_by(|left, right| {
            right
                .score
                .cmp(&left.score)
                .then_with(|| left.depth.cmp(&right.depth))
                .then_with(|| left.sort_key.cmp(&right.sort_key))
                .then_with(|| left.relative_path.cmp(&right.relative_path))
        });
    }
}

#[derive(Debug)]
struct SnapshotCadence {
    last_emit: Option<Instant>,
}

impl SnapshotCadence {
    fn new() -> Self {
        Self { last_emit: None }
    }

    fn should_emit_after_match(&mut self, accepted_count: usize) -> bool {
        if accepted_count == 1 {
            self.last_emit = Some(Instant::now());
            return true;
        }

        let now = Instant::now();
        let should_emit = self
            .last_emit
            .map(|last_emit| now.duration_since(last_emit) >= SNAPSHOT_EMIT_INTERVAL)
            .unwrap_or(true);

        if should_emit {
            self.last_emit = Some(now);
        }

        should_emit
    }
}

#[derive(Debug, Clone)]
struct SearchSnapshot {
    version: usize,
    total: usize,
    items: Vec<FileDetailDTO>,
}

#[derive(Debug)]
struct SnapshotEmitter {
    last_sent_version: usize,
}

impl SnapshotEmitter {
    fn new() -> Self {
        Self {
            last_sent_version: 0,
        }
    }

    fn send_if_newer(
        &mut self,
        tx: &std::sync::mpsc::Sender<SearchSnapshot>,
        snapshot: SearchSnapshot,
    ) {
        if snapshot.version <= self.last_sent_version {
            return;
        }

        self.last_sent_version = snapshot.version;
        let _ = tx.send(snapshot);
    }
}

#[derive(Debug)]
struct SearchSnapshotState {
    ranked: RankedResults,
    cadence: SnapshotCadence,
    accepted_total: usize,
    version: usize,
}

impl SearchSnapshotState {
    fn new(limit: usize) -> Self {
        Self {
            ranked: RankedResults::new(limit),
            cadence: SnapshotCadence::new(),
            accepted_total: 0,
            version: 0,
        }
    }

    fn push(&mut self, item: ScoredSearchResult) -> Option<SearchSnapshot> {
        self.accepted_total += 1;
        self.ranked.push(item);

        if !self.cadence.should_emit_after_match(self.accepted_total) {
            return None;
        }

        Some(self.snapshot())
    }

    fn snapshot(&mut self) -> SearchSnapshot {
        self.version += 1;
        SearchSnapshot {
            version: self.version,
            total: self.accepted_total,
            items: self.ranked.snapshot_file_details(),
        }
    }

    fn snapshot_file_details(&self) -> Vec<FileDetailDTO> {
        self.ranked.snapshot_file_details()
    }

    fn final_total(&self) -> usize {
        self.accepted_total
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

    #[test]
    fn ranked_results_keep_best_matches_first() {
        let mut ranked = RankedResults::new(2);
        ranked.push(scored_path("ConfigStore.txt", "archive/application/config/store/ConfigStore.txt", "appcs"));
        ranked.push(scored_path("App.css", "src/App.css", "appcs"));
        ranked.push(scored_path("ApplicationCacheService.rs", "src/ApplicationCacheService.rs", "appcs"));

        let names: Vec<_> = ranked.snapshot().into_iter().map(|item| item.name).collect();

        assert_eq!(names.len(), 2);
        assert_eq!(names[0], "App.css");
    }

    #[test]
    fn ranked_results_tie_break_by_depth_then_name() {
        let mut ranked = RankedResults::new(10);
        ranked.push(scored_path("App.css", "deep/src/App.css", "appcs"));
        ranked.push(scored_path("App.css", "src/App.css", "appcs"));

        let paths: Vec<_> = ranked.snapshot().into_iter().map(|item| item.relative_path).collect();

        assert_eq!(paths[0], "src/App.css");
    }

    #[test]
    fn ranked_results_total_counts_matches_beyond_limit() {
        let mut state = SearchSnapshotState::new(1);
        state.push(scored_path("App.css", "src/App.css", "appcs"));
        state.push(scored_path("ApplicationCacheService.rs", "src/ApplicationCacheService.rs", "appcs"));

        assert_eq!(state.final_total(), 2);
        assert_eq!(state.snapshot_file_details().len(), 1);
    }

    #[test]
    fn snapshot_cadence_emits_first_match_immediately() {
        let mut cadence = SnapshotCadence::new();

        assert!(cadence.should_emit_after_match(1));
    }

    fn scored_path(name: &str, relative_path: &str, query: &str) -> ScoredSearchResult {
        let fuzzy = score_path_match(query, name, relative_path).unwrap();
        ScoredSearchResult {
            score: fuzzy.score,
            depth: fuzzy.depth,
            sort_key: fuzzy.sort_key,
            name: name.to_string(),
            relative_path: relative_path.to_string(),
            path: PathBuf::from(relative_path),
            size: 0,
            modified: None,
            is_dir: false,
        }
    }
}

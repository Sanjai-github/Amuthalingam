import React, { useState } from 'react';
import { FlatList, ActivityIndicator, Text, View, StyleSheet } from 'react-native';

/**
 * OptimizedList - A performance-optimized list component for large datasets
 * 
 * @param {Array} data - The array of data to display
 * @param {Function} renderItem - Function to render each item
 * @param {Function} keyExtractor - Function to extract a unique key for each item
 * @param {Boolean} isLoading - Whether data is currently loading
 * @param {Function} onEndReached - Function to call when end of list is reached (for pagination)
 * @param {Boolean} hasMoreData - Whether there is more data to load
 * @param {String} emptyMessage - Message to display when list is empty
 * @param {Object} style - Additional styles for the list container
 */
const OptimizedList = ({
  data,
  renderItem,
  keyExtractor,
  isLoading = false,
  onEndReached,
  hasMoreData = false,
  emptyMessage = "No data available",
  style = {},
  ...props
}) => {
  // Optimize list performance with getItemLayout if items have fixed height
  const getItemLayout = props.itemHeight 
    ? (data, index) => ({
        length: props.itemHeight,
        offset: props.itemHeight * index,
        index,
      })
    : undefined;

  // Empty list component
  const ListEmptyComponent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      );
    }
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  };

  // Footer component (loading indicator for pagination)
  const ListFooterComponent = () => {
    if (!isLoading || !hasMoreData) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#0000ff" />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={true}
      getItemLayout={getItemLayout}
      onEndReached={hasMoreData ? onEndReached : null}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={ListFooterComponent}
      style={[styles.list, style]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  }
});

export default OptimizedList;
